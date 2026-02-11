import React, { useState, useRef, useCallback } from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "../components/ui/alert-dialog";

export const useConfirm = () => {
    const [open, setOpen] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        description: '',
        cancelText: 'Cancel',
        confirmText: 'Continue',
        variant: 'default', // default or destructive
    });

    const resolver = useRef(null);

    const confirm = useCallback(({
        title = 'Are you sure?',
        description = 'This action cannot be undone.',
        cancelText = 'Cancel',
        confirmText = 'Continue',
        variant = 'default'
    } = {}) => {
        setConfig({ title, description, cancelText, confirmText, variant });
        setOpen(true);
        return new Promise((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const handleCancel = useCallback(() => {
        setOpen(false);
        if (resolver.current) resolver.current(false);
    }, []);

    const handleConfirm = useCallback(() => {
        setOpen(false);
        if (resolver.current) resolver.current(true);
    }, []);

    const ConfirmDialog = useCallback(() => (
        <AlertDialog open={open} onOpenChange={handleCancel}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{config.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {config.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel}>{config.cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className={config.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                        {config.confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    ), [open, config, handleCancel, handleConfirm]);

    return { confirm, ConfirmDialog };
};
