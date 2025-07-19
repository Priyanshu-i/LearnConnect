"use client"

import { useState } from "react"
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
} from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BasicInfoStep } from "@/components/steps/basic-info-step"
import { PersonalDetailsStep } from "@/components/steps/personal-details-step"
import { InterestsStep } from "@/components/steps/interests-step"
import { AvatarStep } from "@/components/steps/avatar-step"
import { VerificationStep } from "@/components/steps/verification-step"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

export interface UserData {
  email: string
  password: string
  displayName: string
  username: string
  dateOfBirth: string
  bio: string
  location: string
  website: string
  interests: string[]
  photoURL: string
  isEmailVerified: boolean
  createdAt: string
}

const steps = [
  { id: 1, title: "Basic Info", description: "Create your account" },
  { id: 2, title: "Personal Details", description: "Tell us about yourself" },
  { id: 3, title: "Interests", description: "What are you into?" },
  { id: 4, title: "Avatar", description: "Choose your look" },
  { id: 5, title: "Verification", description: "Verify your email" },
]

export function RegistrationStepper() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const [userData, setUserData] = useState<UserData>({
    email: "",
    password: "",
    displayName: "",
    username: "",
    dateOfBirth: "",
    bio: "",
    location: "",
    website: "",
    interests: [],
    photoURL: "",
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
  })

  const updateUserData = (data: Partial<UserData>) => {
    setUserData((prev) => ({ ...prev, ...data }))
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate basic info
      if (!userData.email || !userData.password || !userData.displayName || !userData.username) {
        setError("Please fill in all required fields")
        return
      }
    }

    if (currentStep === 4) {
      // Create account after avatar selection
      await createAccount()
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length))
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Save user data to Firestore
      await setDoc(doc(db, "users", result.user.uid), {
        email: result.user.email,
        displayName: result.user.displayName || "",
        username: result.user.email?.split("@")[0] || "",
        photoURL: result.user.photoURL || "",
        isEmailVerified: result.user.emailVerified,
        createdAt: new Date().toISOString(),
        provider: "google",
      })

      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const createAccount = async () => {
    setLoading(true)
    setError("")

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)

      // Send email verification
      await sendEmailVerification(userCredential.user)

      // Save user data to Firestore
            function removeUndefined(obj: Record<string, any>) {
                return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
            }

            await setDoc(doc(db, "users", userCredential.user.uid), {
                ...removeUndefined(userData),
                uid: userCredential.user.uid,
            });

      setCurrentStep(5) // Move to verification step
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const progress = (currentStep / steps.length) * 100

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
              <span className="text-sm text-muted-foreground">
                Step {currentStep} of {steps.length}
              </span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`text-center ${step.id <= currentStep ? "text-primary font-medium" : ""}`}
                >
                  <div>{step.title}</div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>}

          {currentStep === 1 && (
            <BasicInfoStep
              userData={userData}
              updateUserData={updateUserData}
              onGoogleSignup={handleGoogleSignup}
              loading={loading}
            />
          )}

          {currentStep === 2 && <PersonalDetailsStep userData={userData} updateUserData={updateUserData} />}

          {currentStep === 3 && <InterestsStep userData={userData} updateUserData={updateUserData} />}

          {currentStep === 4 && <AvatarStep userData={userData} updateUserData={updateUserData} />}

          {currentStep === 5 && (
            <VerificationStep email={userData.email} onComplete={() => router.push("/dashboard")} />
          )}

          {currentStep < 5 && (
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1 || loading}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button onClick={handleNext} disabled={loading}>
                {currentStep === 4 ? (loading ? "Creating Account..." : "Create Account") : "Next"}
                {currentStep < 4 && <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
