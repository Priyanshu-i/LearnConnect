"use client"

import { useContext } from "react"
import { AuthContext } from "@/lib/auth-provider"

export function useAuth() {
  return useContext(AuthContext)
}
