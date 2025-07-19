"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, CheckCircle, RefreshCw } from "lucide-react"
import { auth } from "@/lib/firebase"
import { sendEmailVerification, reload } from "firebase/auth"

interface VerificationStepProps {
  email: string
  userData?: any
  onComplete: () => void
}

export function VerificationStep({ email, userData, onComplete }: VerificationStepProps) {
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [checkingVerification, setCheckingVerification] = useState(true)

  useEffect(() => {
    // Initial check for verification status
    const checkInitialVerification = async () => {
      if (auth.currentUser) {
        await reload(auth.currentUser)
        setIsVerified(auth.currentUser.emailVerified)
      }
      setCheckingVerification(false)
    }

    checkInitialVerification()

    // Set up interval to check verification status
    const checkVerification = setInterval(async () => {
      if (auth.currentUser) {
        await reload(auth.currentUser)
        if (auth.currentUser.emailVerified) {
          setIsVerified(true)
          clearInterval(checkVerification)
        }
      }
    }, 3000)

    return () => clearInterval(checkVerification)
  }, [])

  const resendVerification = async () => {
    if (!auth.currentUser) return

    setResendLoading(true)
    try {
      await sendEmailVerification(auth.currentUser)
      setMessage("Verification email sent successfully!")
      setTimeout(() => setMessage(""), 5000)
    } catch (error: any) {
      setMessage("Failed to send verification email. Please try again.")
      setTimeout(() => setMessage(""), 5000)
    } finally {
      setResendLoading(false)
    }
  }

  const handleComplete = async () => {
    // Double-check verification status before proceeding
    if (!auth.currentUser) {
      setMessage("Authentication error. Please try again.")
      return
    }

    setLoading(true)
    try {
      // Reload user to get latest verification status
      await reload(auth.currentUser)

      if (!auth.currentUser.emailVerified) {
        setMessage("Please verify your email before continuing.")
        setLoading(false)
        return
      }

      // Only proceed if email is verified
      onComplete()
    } catch (error) {
      console.error("Error checking verification:", error)
      setMessage("Error checking verification status. Please try again.")
      setLoading(false)
    }
  }

  if (checkingVerification) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <RefreshCw className="h-16 w-16 text-blue-500 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold">Checking Verification Status...</h2>
          <p className="text-muted-foreground">Please wait while we check your email verification status.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          {isVerified ? (
            <CheckCircle className="h-16 w-16 text-green-500" />
          ) : (
            <Mail className="h-16 w-16 text-blue-500" />
          )}
        </div>
        <h2 className="text-xl font-semibold">{isVerified ? "Email Verified!" : "Verify Your Email"}</h2>
        <p className="text-muted-foreground">
          {isVerified ? "Your email has been successfully verified." : `We've sent a verification link to ${email}`}
        </p>
      </div>

      {!isVerified && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Please check your email and click the verification link to continue.
                </p>
                <p className="text-xs text-muted-foreground">Don't forget to check your spam folder!</p>
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ Do not refresh this page until you've verified your email
                </p>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" onClick={resendVerification} disabled={resendLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${resendLoading ? "animate-spin" : ""}`} />
                  Resend Verification Email
                </Button>
              </div>

              {message && (
                <Alert>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isVerified && (
        <div className="text-center">
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your email has been verified! You can now complete your registration.
            </AlertDescription>
          </Alert>
          <Button onClick={handleComplete} disabled={loading} size="lg">
            {loading ? "Setting up your account..." : "Complete Registration"}
          </Button>
        </div>
      )}
    </div>
  )
}
