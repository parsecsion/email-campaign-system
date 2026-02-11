import React, { useState } from 'react';
import { Bot, Key, Plus, Trash2, Cpu, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const AgentSettings = ({
    apiKey, setApiKey,
    models, setModels,
    defaultModel, setDefaultModel,
    isDirty
}) => {
    const [showKey, setShowKey] = useState(false);
    const [newModelId, setNewModelId] = useState('');
    const [newModelName, setNewModelName] = useState('');

    const addModel = () => {
        if (!newModelId || !newModelName) return;
        // Check for duplicate ID
        if (models.some(m => m.id === newModelId)) return;

        setModels([...models, { id: newModelId, name: newModelName, isCustom: true }]);
        setNewModelId('');
        setNewModelName('');
    };

    const removeModel = (id) => {
        setModels(models.filter(m => m.id !== id));
        if (defaultModel === id && models.length > 0) {
            setDefaultModel(models[0].id);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* API Key Section */}
            <div className="ink-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Key className="h-5 w-5 text-gray-500" /> OpenRouter API Key
                    </h3>
                </div>
                <div className="p-6 space-y-4 max-w-2xl">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">API Key</label>
                        <div className="flex gap-2">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="sk-or-..."
                                className="flex-1 p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                onClick={() => setShowKey(!showKey)}
                                className="w-20"
                            >
                                {showKey ? "Hide" : "Show"}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Required for the AI Agent to function. If empty, the system environment variable will be used.
                        </p>
                    </div>
                </div>
            </div>

            {/* Models Section */}
            <div className="ink-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-gray-500" /> AI Models
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    {/* Default Model Selection */}
                    <div className="space-y-2 max-w-md">
                        <label className="text-sm font-medium text-gray-700">Default Model</label>
                        <Select value={defaultModel} onValueChange={setDefaultModel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                                {models.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name} {m.isCustom ? '(Custom)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">This model will be selected by default when starting a new chat.</p>
                    </div>

                    <div className="border-t border-gray-100 my-4" />

                    {/* Manage Models */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900">Custom Models</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            <input
                                placeholder="Model ID (e.g., openai/gpt-4o)"
                                value={newModelId}
                                onChange={e => setNewModelId(e.target.value)}
                                className="p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none font-mono text-sm"
                            />
                            <div className="flex gap-2">
                                <input
                                    placeholder="Display Name (e.g., GPT-4o)"
                                    value={newModelName}
                                    onChange={e => setNewModelName(e.target.value)}
                                    className="flex-1 p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                />
                                <Button onClick={addModel} disabled={!newModelId || !newModelName}>
                                    <Plus className="size-4 mr-2" /> Add
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {models.filter(m => m.isCustom).length === 0 && (
                                <p className="text-sm text-gray-500 italic">No custom models added.</p>
                            )}
                            {models.filter(m => m.isCustom).map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg group">
                                    <div>
                                        <p className="font-medium text-sm text-gray-900">{m.name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{m.id}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeModel(m.id)}
                                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
