import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * Medical analysis procedures
   */
  medical: router({
    /**
     * Upload and analyze a medical report via LLM
     */
    uploadReport: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileContent: z.string(), // Base64 encoded file content
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          // Upload file to S3
          const fileBuffer = Buffer.from(input.fileContent, "base64");
          const fileKey = `medical-reports/${ctx.user.id}/${Date.now()}-${input.fileName}`;
          const { url: fileUrl } = await storagePut(fileKey, fileBuffer, input.mimeType);

          // Use LLM to extract medical information from the uploaded file
          const analysisPrompt = `You are a medical data extraction assistant. Analyze the provided medical document and extract:
1. Symptoms mentioned
2. Current medications
3. Clinical metrics (glucose, HbA1c, blood pressure, etc.)
4. Any diagnoses or conditions mentioned

Provide the response in JSON format with keys: symptoms, medications, metrics, conditions.`;

          const llmResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: analysisPrompt,
              },
              {
                role: "user",
                content: `Please analyze this medical document from URL: ${fileUrl}`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "medical_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    symptoms: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of symptoms mentioned",
                    },
                    medications: {
                      type: "array",
                      items: { type: "string" },
                      description: "Current medications",
                    },
                    metrics: {
                      type: "object",
                      description: "Clinical metrics",
                      additionalProperties: { type: "string" },
                    },
                    conditions: {
                      type: "array",
                      items: { type: "string" },
                      description: "Diagnoses or conditions",
                    },
                  },
                  required: ["symptoms", "medications", "metrics", "conditions"],
                  additionalProperties: false,
                },
              },
            },
          });

          let extractedData = {
            symptoms: [],
            medications: [],
            metrics: {},
            conditions: [],
          };
          try {
            const content = llmResponse.choices[0]?.message.content;
            if (typeof content === "string" && content.trim()) {
              const parsed = JSON.parse(content);
              extractedData = {
                symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
                medications: Array.isArray(parsed.medications) ? parsed.medications : [],
                metrics: typeof parsed.metrics === "object" ? parsed.metrics : {},
                conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
              };
            }
          } catch (parseError) {
            console.warn("Failed to parse LLM response:", parseError);
          }

          // Generate risk prediction based on extracted data
          const riskAnalysis = await generateRiskPrediction(extractedData);

          return {
            success: true,
            fileUrl: fileUrl,
            fileKey,
            extractedData,
            riskAnalysis,
          };
        } catch (error) {
          console.error("Upload analysis error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to analyze medical report",
          });
        }
      }),

    /**
     * Analyze manually entered medical data
     */
    analyzeManualInput: protectedProcedure
      .input(
        z.object({
          bloodGlucose: z.number().min(0).max(500),
          hba1c: z.number().min(0).max(15),
          age: z.number().min(1).max(150),
          bmi: z.number().min(10).max(60),
          symptoms: z.array(z.string()),
          medicines: z.array(z.string()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const riskAnalysis = await generateRiskPrediction({
            bloodGlucose: input.bloodGlucose,
            hba1c: input.hba1c,
            age: input.age,
            bmi: input.bmi,
            symptoms: input.symptoms,
            medications: input.medicines,
          });

          return {
            success: true,
            riskAnalysis,
          };
        } catch (error) {
          console.error("Manual analysis error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to analyze medical data",
          });
        }
      }),

    /**
     * Get analysis history for the current user
     */
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      // TODO: Implement database query to fetch user's analysis history
      // For now, return empty array
      return [];
    }),
  }),
});

/**
 * Generate cardiovascular complication risk prediction with realistic confidence
 */
async function generateRiskPrediction(medicalData: {
  bloodGlucose?: number;
  hba1c?: number;
  age?: number;
  bmi?: number;
  symptoms?: string[];
  medications?: string[];
  metrics?: Record<string, string>;
  conditions?: string[];
}): Promise<{
  riskLevel: "low" | "moderate" | "high" | "very_high";
  confidencePercentage: number;
  detectedEntities: {
    symptoms: string[];
    medications: string[];
    metrics: Record<string, unknown>;
    inferredIndicators?: string[];
  };
  diagnosticSummary: string;
}> {
  // Build inferred clinical indicators from conditions and symptoms
  const inferredIndicators: string[] = [];
  if (medicalData.conditions && medicalData.conditions.length > 0) {
    inferredIndicators.push(...medicalData.conditions);
  }
  if (medicalData.symptoms && medicalData.symptoms.length > 0) {
    medicalData.symptoms.forEach(symptom => {
      if (!inferredIndicators.includes(symptom)) {
        inferredIndicators.push(symptom);
      }
    });
  }

  // Calculate realistic confidence based on available data
  let baseConfidence = 50;
  let hasStrongMetrics = false;

  // Award points for available data
  if (medicalData.bloodGlucose || medicalData.hba1c) baseConfidence += 12;
  if (medicalData.age && medicalData.bmi) baseConfidence += 8;
  if (medicalData.conditions && medicalData.conditions.length > 0) baseConfidence += 15;
  if (medicalData.symptoms && medicalData.symptoms.length > 0) baseConfidence += 10;

  // Check for strong metrics (glucose + HbA1c + additional vitals)
  const hasGlucoseData = medicalData.bloodGlucose !== undefined && medicalData.hba1c !== undefined;
  const hasAdditionalMetrics = medicalData.metrics && Object.keys(medicalData.metrics).length > 1;

  if (hasGlucoseData && hasAdditionalMetrics) {
    hasStrongMetrics = true;
    baseConfidence = Math.min(85, baseConfidence + 10);
  } else if (hasGlucoseData) {
    baseConfidence = Math.min(82, baseConfidence + 5);
  } else {
    // Cap confidence at 78% if missing critical metrics like glucose/HbA1c
    baseConfidence = Math.min(78, baseConfidence);
  }

  const prompt = `You are a medical AI assistant providing cardiovascular complication risk assessment. 
Based on the following patient data, assess the risk of cardiovascular complications.

Patient Data:
- Blood Glucose: ${medicalData.bloodGlucose || "Not provided"} mg/dL
- HbA1c: ${medicalData.hba1c || "Not provided"}%
- Age: ${medicalData.age || "Not provided"} years
- BMI: ${medicalData.bmi || "Not provided"}
- Symptoms: ${(medicalData.symptoms || []).join(", ") || "None reported"}
- Current Medications: ${(medicalData.medications || []).join(", ") || "None reported"}
- Other Metrics: ${JSON.stringify(medicalData.metrics || {})}
- Known Conditions: ${(medicalData.conditions || []).join(", ") || "None reported"}

IMPORTANT GUIDELINES:
- Use simple, direct clinical language. Avoid complex medical jargon.
- If metrics are missing, base assessment on known conditions and symptoms.
- Confidence should reflect data completeness. Maximum for this case: ${baseConfidence}%
- Do not exceed ${baseConfidence}% confidence.
- Summary should be 2-3 sentences, referencing specific conditions or symptoms.
- Avoid phrases like "inherently place them at" or "adverse cardiovascular events". Use simpler language.

Provide your response in JSON format with:
1. riskLevel: "low", "moderate", "high", or "very_high"
2. confidencePercentage: ${Math.min(baseConfidence, 85)} (do not exceed this value)
3. diagnosticSummary: A clinical assessment referencing specific conditions or symptoms`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a medical AI assistant providing clinical decision support. Be conservative with confidence scores. Provide evidence-based, simplified assessments.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "risk_assessment",
        strict: true,
        schema: {
          type: "object",
          properties: {
            riskLevel: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high"],
              description: "Cardiovascular complication risk level",
            },
            confidencePercentage: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Confidence in the assessment",
            },
            diagnosticSummary: {
              type: "string",
              description: "Clinical assessment summary",
            },
          },
          required: ["riskLevel", "confidencePercentage", "diagnosticSummary"],
          additionalProperties: false,
        },
      },
    },
  });

  let assessment = {
    riskLevel: "moderate" as const,
    confidencePercentage: baseConfidence,
    diagnosticSummary: "Unable to generate assessment.",
  };

  try {
    const content = response.choices[0]?.message.content;
    if (typeof content === "string" && content.trim()) {
      const parsed = JSON.parse(content);
      const validRiskLevels = ["low", "moderate", "high", "very_high"];

      // Enforce confidence cap
      const llmConfidence = Math.min(
        baseConfidence,
        Math.max(0, parsed.confidencePercentage || baseConfidence)
      );

      assessment = {
        riskLevel: validRiskLevels.includes(parsed.riskLevel) ? parsed.riskLevel : "moderate",
        confidencePercentage: llmConfidence,
        diagnosticSummary: parsed.diagnosticSummary || "Assessment completed.",
      };
    }
  } catch (parseError) {
    console.warn("Failed to parse risk assessment:", parseError);
  }

  return {
    riskLevel: assessment.riskLevel || "moderate",
    confidencePercentage: assessment.confidencePercentage || baseConfidence,
    detectedEntities: {
      symptoms: medicalData.symptoms || [],
      medications: medicalData.medications || [],
      metrics: {
        bloodGlucose: medicalData.bloodGlucose,
        hba1c: medicalData.hba1c,
        age: medicalData.age,
        bmi: medicalData.bmi,
        ...medicalData.metrics,
      },
      inferredIndicators: inferredIndicators.length > 0 ? inferredIndicators : undefined,
    },
    diagnosticSummary:
      assessment.diagnosticSummary ||
      "Analysis complete. Please review with a healthcare professional.",
  };
}

export type AppRouter = typeof appRouter;
