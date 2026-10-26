import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import API from "../services/api.service";
import { getSupabaseClient } from "../utils/supabase/client";

export function ReviewsDebugger() {
  const [testResult, setTestResult] = useState<any>(null);
  const [directTestResult, setDirectTestResult] =
    useState<any>(null);
  const [backendTestResult, setBackendTestResult] =
    useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  const [isBackendLoading, setIsBackendLoading] =
    useState(false);

  const testDirectFetch = async () => {
    setIsLoading(true);
    try {

      const reviews = await API.reviews.getAll();

      setTestResult({
        success: true,
        data: reviews,
        count: reviews?.length || 0,
        structure: reviews?.[0]
          ? Object.keys(reviews[0])
          : "No data",
        message:
          reviews?.length > 0
            ? `✅ Backend API SUCCESS! Fetched ${reviews.length} review(s)`
            : "⚠️ Backend returned empty array - check backend logs",
      });
    } catch (error: any) {
      console.error("❌ Backend API call failed:", error);
      setTestResult({
        success: false,
        error: error.message,
        message: "❌ Backend API call failed",
        possibleCauses: [
          "Backend function not deployed",
          "Network/CORS issues",
          "Backend database connection failed",
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectSupabase = async () => {
    setIsDirectLoading(true);
    try {


      const supabase = getSupabaseClient();

      const { data, error, count } = await supabase
        .from("reviews")
        .select("*", { count: "exact" });


      if (error) {
        console.error("❌ Supabase error:", error);
        setDirectTestResult({
          success: false,
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          message: "❌ Direct Supabase query FAILED!",
          diagnosis:
            error.message.includes("policy") ||
              error.code === "42501"
              ? "🔒 RLS IS BLOCKING ACCESS - Disable RLS in SQL Editor!"
              : "Database error - check error details below",
        });
      } else {

        setDirectTestResult({
          success: true,
          data: data,
          count: data?.length || 0,
          totalCount: count,
          structure: data?.[0]
            ? Object.keys(data[0])
            : "No data",
          message:
            data?.length > 0
              ? `✅ Direct Supabase query SUCCESS! Found ${data.length} review(s)`
              : "⚠️ Table exists but is EMPTY",
          diagnosis:
            data?.length > 0
              ? "✅ RLS is disabled! Data exists! Backend might have an issue."
              : "📝 Table is empty - add reviews in Supabase Table Editor",
        });
      }
    } catch (error: any) {
      console.error("❌ Direct Supabase test crashed:", error);
      setDirectTestResult({
        success: false,
        error: error.message,
        message: "❌ Failed to connect to Supabase",
        diagnosis:
          "Network error or invalid Supabase configuration",
      });
    } finally {
      setIsDirectLoading(false);
    }
  };

  const testBackendFetch = async () => {
    setIsBackendLoading(true);
    try {

      const result = await API.reviews.testConnection();

      setBackendTestResult({
        success: result.success,
        data: result,
        message: result.success
          ? `✅ Backend can query Supabase! Found ${result.tests?.directQuery?.count || 0} reviews`
          : "❌ Backend Supabase query failed",
        diagnosis: result.success
          ? `✅ Both direct query and repository query work in backend!`
          : result.error?.message || "Unknown backend error",
      });
    } catch (error: any) {
      console.error(
        "❌ Backend diagnostic call failed:",
        error,
      );
      setBackendTestResult({
        success: false,
        error: error.message,
        message: "❌ Backend diagnostic endpoint unreachable",
        diagnosis: error.message.includes("404")
          ? "🚨 Backend function not deployed! Deploy the Supabase function first."
          : "Backend function might not be deployed or endpoint missing",
      });
    } finally {
      setIsBackendLoading(false);
    }
  };
}