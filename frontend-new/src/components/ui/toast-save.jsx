"use client"

import * as React from "react"
import { Check, AlertCircle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export function ToastSave({
    state = "initial",
    onReset,
    onSave,
    loadingText = "Saving",
    successText = "Saved",
    initialText = "Unsaved changes",
    resetText = "Discard",
    saveText = "Save Changes",
    className,
    ...props
}) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                className={cn(
                    "flex items-center gap-3",
                    className
                )}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                {...props}
            >
                {/* Status Indicator */}
                <div className="flex items-center gap-2 mr-2">
                    {state === "loading" && (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Spinner size="sm" />
                            <span className="text-sm font-medium">{loadingText}...</span>
                        </div>
                    )}
                    {state === "success" && (
                        <div className="flex items-center gap-2 text-green-600">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">{successText}</span>
                        </div>
                    )}
                    {state === "initial" && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 border border-amber-200">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">{initialText}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {state === "initial" && (
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={onReset}
                            variant="ghost"
                            className="h-10 px-4 text-gray-500 hover:text-gray-900 cursor-pointer text-base"
                        >
                            {resetText}
                        </Button>
                        <Button
                            onClick={onSave}
                            className="h-10 px-6 bg-black text-white hover:bg-gray-800 shadow-sm whitespace-nowrap text-base"
                        >
                            {saveText}
                        </Button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    )
}
