"use client"

// Adapted from shadcn/ui toast
import { useState, useEffect } from "react"

const TOAST_TIMEOUT = 5000

export function useToast() {
  const [toasts, setToasts] = useState([])

  interface ToastOptions {
    title: string
    description: string
    variant?: "default" | "destructive"
  }
  
  const toast = ({ title, description, variant = "default" }: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, title, description, variant }])

    return id
  }

  const dismiss = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.slice(1))
      }, TOAST_TIMEOUT)

      return () => clearTimeout(timer)
    }
  }, [toasts])

  // Simple toast UI renderer
  useEffect(() => {
    const renderToast = () => {
      // Remove existing toast container if it exists
      let container = document.getElementById("toast-container")
      if (container) {
        document.body.removeChild(container)
      }

      // If no toasts, don't create container
      if (toasts.length === 0) return

      // Create new container
      container = document.createElement("div")
      container.id = "toast-container"
      container.style.position = "fixed"
      container.style.bottom = "20px"
      container.style.right = "20px"
      container.style.zIndex = "9999"
      container.style.display = "flex"
      container.style.flexDirection = "column"
      container.style.gap = "10px"

      // Add toasts to container
      toasts.forEach((toast) => {
        const toastElement = document.createElement("div")
        toastElement.style.padding = "16px"
        toastElement.style.borderRadius = "8px"
        toastElement.style.width = "300px"
        toastElement.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)"
        toastElement.style.display = "flex"
        toastElement.style.flexDirection = "column"
        toastElement.style.gap = "4px"
        toastElement.style.animation = "slideIn 0.3s ease"

        // Set background color based on variant
        if (toast.variant === "destructive") {
          toastElement.style.backgroundColor = "#f44336" // red
          toastElement.style.color = "white"
        } else {
          toastElement.style.backgroundColor = "white"
          toastElement.style.color = "black"
        }

        // Add toast content
        const titleElement = document.createElement("div")
        titleElement.textContent = toast.title
        titleElement.style.fontWeight = "bold"

        const descElement = document.createElement("div")
        descElement.textContent = toast.description
        descElement.style.fontSize = "14px"

        // Close button
        const closeButton = document.createElement("button")
        closeButton.textContent = "×"
        closeButton.style.position = "absolute"
        closeButton.style.top = "8px"
        closeButton.style.right = "8px"
        closeButton.style.background = "none"
        closeButton.style.border = "none"
        closeButton.style.cursor = "pointer"
        closeButton.style.fontSize = "18px"
        closeButton.onclick = () => dismiss(toast.id)

        toastElement.appendChild(titleElement)
        toastElement.appendChild(descElement)
        toastElement.appendChild(closeButton)
        container.appendChild(toastElement)
      })

      document.body.appendChild(container)

      // Add animation style
      const style = document.createElement("style")
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `
      document.head.appendChild(style)
    }

    renderToast()

    return () => {
      const container = document.getElementById("toast-container")
      if (container) {
        document.body.removeChild(container)
      }
    }
  }, [toasts])

  return { toast, dismiss }
}
