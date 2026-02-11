
import "@ncdai/react-wheel-picker/style.css";
import * as WheelPickerPrimitive from "@ncdai/react-wheel-picker";
import { cn } from "@/lib/utils";

function WheelPickerWrapper({
    className,
    ...props
}) {
    return (
        <WheelPickerPrimitive.WheelPickerWrapper
            className={cn(
                "w-full max-w-xs rounded-none border border-black bg-white px-1 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]",
                "*:data-rwp:first:*:data-rwp-highlight-wrapper:rounded-none",
                "*:data-rwp:last:*:data-rwp-highlight-wrapper:rounded-none",
                className
            )}
            {...props}
        />
    );
}

function WheelPicker({
    classNames,
    ...props
}) {
    return (
        <WheelPickerPrimitive.WheelPicker
            classNames={{
                optionItem: "text-gray-400 mx-2",
                highlightWrapper:
                    "bg-gray-100 text-black font-bold border-y border-gray-200",
                ...classNames,
            }}
            {...props}
        />
    );
}

export { WheelPicker, WheelPickerWrapper };
