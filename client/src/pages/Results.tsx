import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

interface RiskAnalysis {
  riskLevel: "low" | "moderate" | "high" | "very_high";
  confidencePercentage: number;
  detectedEntities: {
    symptoms: string[];
    medications: string[];
    metrics: Record<string, unknown>;
  };
  diagnosticSummary: string;
}

export default function Results() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);
  const dataStr = params.get("data");
  const type = params.get("type");

  if (!dataStr) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-foreground mb-4">No analysis data found.</p>
          <Link href="/analyze">
            <Button className="bg-secondary hover:bg-secondary/90">
              Back to Analysis
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  let analysis: RiskAnalysis;
  try {
    const parsed = JSON.parse(dataStr);
    analysis = parsed.riskAnalysis || parsed;
  } catch {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-foreground mb-4">Failed to load analysis data.</p>
          <Link href="/analyze">
            <Button className="bg-secondary hover:bg-secondary/90">
              Back to Analysis
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const getRiskIcon = () => {
    switch (analysis.riskLevel) {
      case "low":
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case "moderate":
        return <AlertCircle className="w-16 h-16 text-yellow-500" />;
      case "high":
        return <AlertTriangle className="w-16 h-16 text-orange-500" />;
      case "very_high":
        return <AlertTriangle className="w-16 h-16 text-red-500" />;
    }
  };

  const getRiskColor = () => {
    switch (analysis.riskLevel) {
      case "low":
        return "bg-green-50 border-green-200";
      case "moderate":
        return "bg-yellow-50 border-yellow-200";
      case "high":
        return "bg-orange-50 border-orange-200";
      case "very_high":
        return "bg-red-50 border-red-200";
    }
  };

  const getRiskBadgeVariant = () => {
    switch (analysis.riskLevel) {
      case "low":
        return "default";
      case "moderate":
        return "secondary";
      case "high":
        return "destructive";
      case "very_high":
        return "destructive";
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Analysis Results
            </h1>
            <p className="text-muted-foreground">
              {type === "upload"
                ? "Medical Report Analysis"
                : "Manual Data Analysis"}
            </p>
          </div>
          <Link href="/analyze">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              New Analysis
            </Button>
          </Link>
        </div>

        {/* Risk Level Card */}
        <Card className={`p-8 mb-8 border-2 ${getRiskColor()}`}>
          <div className="flex items-center gap-6 mb-6">
            {getRiskIcon()}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Disease Risk Assessment
              </h2>
              <div className="flex items-center gap-3">
                <Badge variant={getRiskBadgeVariant()} className="text-base">
                  {analysis.riskLevel.toUpperCase()}
                </Badge>
                <span className="text-lg font-semibold text-foreground">
                  {analysis.confidencePercentage}% Confidence
                </span>
              </div>
            </div>
          </div>

          <div className="bg-background/50 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-secondary" />
              <h3 className="font-semibold text-foreground">
                Confidence Score
              </h3>
            </div>
            <div className="w-full bg-border rounded-full h-3 overflow-hidden">
              <div
                className="bg-secondary h-full transition-all duration-500"
                style={{ width: `${analysis.confidencePercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Based on clinical data analysis
            </p>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Detected Entities */}
          <Card className="p-6 border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Detected Entities
            </h3>

            {/* Symptoms */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Symptoms
              </h4>
              {analysis.detectedEntities.symptoms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.detectedEntities.symptoms.map((symptom, idx) => (
                    <Badge key={idx} variant="secondary">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No symptoms detected
                </p>
              )}
            </div>

            {/* Medications */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Medications
              </h4>
              {analysis.detectedEntities.medications.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.detectedEntities.medications.map((med, idx) => (
                    <Badge key={idx} variant="outline">
                      {med}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No medications detected
                </p>
              )}
            </div>
          </Card>

          {/* Clinical Metrics */}
          <Card className="p-6 border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Clinical Metrics
            </h3>
            <div className="space-y-4">
              {Object.entries(analysis.detectedEntities.metrics).map(
                ([key, value]) => {
                  if (value === null || value === undefined) return null;
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span className="font-semibold text-foreground">
                        {String(value)}
                      </span>
                    </div>
                  );
                }
              )}
              {Object.values(analysis.detectedEntities.metrics).every(
                (v) => v === null || v === undefined
              ) && (
                <p className="text-sm text-muted-foreground">
                  No metrics available
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Diagnostic Summary */}
        <Card className="p-8 border border-secondary/20 bg-secondary/5 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Diagnostic Summary
          </h3>
          <p className="text-foreground leading-relaxed text-base">
            {analysis.diagnosticSummary}
          </p>
          <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground">
              <strong>Important:</strong> This analysis is provided for
              informational purposes only and should not be considered as
              medical advice. Always consult with qualified healthcare
              professionals for diagnosis and treatment decisions.
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="flex-1 bg-secondary hover:bg-secondary/90 gap-2">
            <Download className="w-4 h-4" />
            Download Report
          </Button>
          <Link href="/history" className="flex-1">
            <Button variant="outline" className="w-full">
              View History
            </Button>
          </Link>
          <Link href="/analyze" className="flex-1">
            <Button variant="outline" className="w-full">
              New Analysis
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
