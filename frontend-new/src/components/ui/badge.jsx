import * as React from "react"
import { cn } from "@/lib/utils"
// Import from the new variants file
import { badgeVariants } from "@/lib/variants"

// Default export component
function Badge({ className, variant, ...props }) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge }
