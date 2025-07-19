export class EmailVerificationService {
  private static readonly USER_DATA_KEY = "pendingUserData"
  private static readonly VERIFICATION_TOKEN_KEY = "verificationToken"

  /**
   * Send verification email without creating Firebase account
   */
  static async sendVerificationEmail(email: string, userData: any): Promise<void> {
    try {
      // Generate verification token
      const verificationToken = this.generateVerificationToken()

      // Store user data and token locally
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData))
      localStorage.setItem(this.VERIFICATION_TOKEN_KEY, verificationToken)

      // Send verification email via API route
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          verificationToken,
          userData: {
            displayName: userData.displayName,
            username: userData.username,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send verification email")
      }

      console.log("Verification email sent successfully")
    } catch (error) {
      console.error("Error sending verification email:", error)
      throw error
    }
  }

  /**
   * Generate a secure verification token
   */
  private static generateVerificationToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  /**
   * Verify token and create Firebase account
   */
  static async verifyTokenAndCreateAccount(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error verifying token:", error)
      return { success: false, message: "Verification failed" }
    }
  }

  /**
   * Clear pending registration data
   */
  static clearPendingData(): void {
    localStorage.removeItem(this.USER_DATA_KEY)
    localStorage.removeItem(this.VERIFICATION_TOKEN_KEY)
  }

  /**
   * Get pending user data
   */
  static getPendingUserData(): any | null {
    const data = localStorage.getItem(this.USER_DATA_KEY)
    return data ? JSON.parse(data) : null
  }

  /**
   * Get verification token
   */
  static getVerificationToken(): string | null {
    return localStorage.getItem(this.VERIFICATION_TOKEN_KEY)
  }

  /**
   * Check if there's a pending verification
   */
  static hasPendingVerification(): boolean {
    return !!localStorage.getItem(this.USER_DATA_KEY) && !!localStorage.getItem(this.VERIFICATION_TOKEN_KEY)
  }
}
