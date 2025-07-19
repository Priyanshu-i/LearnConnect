"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, RefreshCw, ArrowLeft, CheckCircle } from "lucide-react"
import { EmailVerificationService } from "@/lib/email-verification"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

interface EmailVerificationStepProps {
  email: string
  onStartOver: () => void
}

export function EmailVerificationStep({ email, onStartOver }: EmailVerificationStepProps) {
  const [resendLoading, setResendLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [checkingVerification, setCheckingVerification] = useState(true)

  useEffect(() => {
    // Check verification status periodically
    const checkVerification = setInterval(async () => {
      const user = auth.currentUser
      if (user) {
        await user.reload()
        if (user.emailVerified) {
          setIsVerified(true)
          clearInterval(checkVerification)
        }
      }
    }, 3000)

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload()
        setIsVerified(user.emailVerified)
      }
      setCheckingVerification(false)
    })

    return () => {
      clearInterval(checkVerification)
      unsubscribe()
    }
  }, [])

  const resendVerification = async () => {
    setResendLoading(true)
    try {
      const userData = EmailVerificationService.getPendingUserData()
      if (userData) {
        await EmailVerificationService.sendVerificationEmail(email, userData)
        setMessage("Verification email sent successfully!")
        setTimeout(() => setMessage(""), 5000)
      } else {
        setMessage("No pending registration data found. Please start over.")
      }
    } catch (error: any) {
      setMessage("Failed to send verification email. Please try again.")
      setTimeout(() => setMessage(""), 5000)
    } finally {
      setResendLoading(false)
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

  if (isVerified) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold">Email Verified!</h2>
          <p className="text-muted-foreground">Your account is being set up. You'll be redirected shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Mail className="h-16 w-16 text-blue-500" />
        </div>
        <h2 className="text-xl font-semibold">Check Your Email</h2>
        <p className="text-muted-foreground">
          We've sent a verification link to <strong>{email}</strong>
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Click the link in your email to verify your account.</p>
              <p className="text-xs text-muted-foreground">Don't forget to check your spam folder!</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> A temporary account has been created. You must verify your email to
                  complete registration and access features.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={resendVerification}
                disabled={resendLoading}
                className="w-full bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${resendLoading ? "animate-spin" : ""}`} />
                Resend Verification Email
              </Button>

              <Button variant="ghost" onClick={onStartOver} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Start Over with Different Email
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

      <div className="text-center text-xs text-muted-foreground">
        <p>Having trouble? Make sure you're checking the correct email address.</p>
        <p>After clicking the verification link, return to this page or refresh to continue.</p>
      </div>
    </div>
  )
}
