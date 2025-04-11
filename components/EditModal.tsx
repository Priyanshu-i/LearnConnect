"use client";

import { Fragment, useState, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import type { Post } from "@/lib/types";
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, addDoc, doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Navbar } from "@/components/navbar"
import { ImageIcon, Loader2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EditModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPost: { title: string; content: string }) => Promise<void>;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setSelectedImage: (image: File | null) => void;
}

export default function EditModal({ post, isOpen, onClose, onSave }: EditModalProps) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { user } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const uploadImageToCloudinary = async (file: File) => {
      setIsUploading(true)
  
      try {
        // Create a FormData object to send the image
        const formData = new FormData()
        formData.append("file", file)
        formData.append("upload_preset", `${process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}`) // Replace with your Cloudinary upload preset
  
        // Upload to Cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, // Replace with your Cloudinary cloud name
          {
            method: "POST",
            body: formData,
          },
        )
  
        const data = await response.json()
  
        if (data.secure_url) {
          return data.secure_url
        } else {
          throw new Error("Failed to upload image")
        }
      } catch (error) {
        console.error("Error uploading image:", error)
        toast({
          title: "Upload failed",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsUploading(false)
      }
    }

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ title, content });
    try{
      let imageURL = null

      // Upload image if selected
      if (selectedImage) {
        imageURL = await uploadImageToCloudinary(selectedImage)
      }
      
    }catch{
      toast({
        title: "Error",
        description: "Failed to update post. Please try again.",
        variant: "destructive",
      })
    }
    onClose();
  };
  
  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
  
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        })
        return
      }
  
      setSelectedImage(file)
  
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }


  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Edit Post
                </Dialog.Title>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      required
                    ></textarea>
                  </div>
                  {imagePreview ? (
                                  <div className="relative">
                                    <div className="relative w-full h-48 rounded-md overflow-hidden">
                                      <img
                                        src={imagePreview || "/placeholder.svg"}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute top-2 right-2 rounded-full"
                                      onClick={handleRemoveImage}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <label htmlFor="image" className="text-sm font-medium">
                                      Add an image (optional)
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        ref={fileInputRef}
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                      />
                                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <ImageIcon className="h-4 w-4 mr-2" />
                                        Select Image
                                      </Button>
                                    </div>
                                  </div>
                                )}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="text-black px-4 py-2 rounded bg-gray-200">
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 rounded bg-blue-500 text-white">
                      Save
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
