import { useState, ReactNode } from 'react'
import { APIKeyManager } from '../../services/api-key-manager'

interface APIKeyDialogProps {
    onKeysChange: () => void;
    children?: ReactNode;
}

export function APIKeyDialog({ onKeysChange, children }: APIKeyDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [anthropicKey, setAnthropicKey] = useState(APIKeyManager.getKey('anthropic') || '')
    const [openaiKey, setOpenaiKey] = useState(APIKeyManager.getKey('openai') || '')

    const handleSave = () => {
        if (anthropicKey) {
            APIKeyManager.setKey('anthropic', anthropicKey)
        } else {
            APIKeyManager.removeKey('anthropic')
        }

        if (openaiKey) {
            APIKeyManager.setKey('openai', openaiKey)
        } else {
            APIKeyManager.removeKey('openai')
        }

        onKeysChange()
        setIsOpen(false)
    }

    return (
        <div>
            <div onClick={() => setIsOpen(true)}>
                {children || (
                    <button className="btn btn-primary w-full">
                        Configure API Keys
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-background p-6 rounded-lg shadow-lg w-96">
                        <h2 className="text-xl font-bold mb-4 text-foreground">Configure API Keys</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-foreground">
                                    Anthropic API Key
                                </label>
                                <input
                                    type="password"
                                    value={anthropicKey}
                                    onChange={(e) => setAnthropicKey(e.target.value)}
                                    className="input input-bordered w-full bg-background text-foreground placeholder:text-muted-foreground"
                                    placeholder="sk-ant-..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-foreground">
                                    OpenAI API Key
                                </label>
                                <input
                                    type="password"
                                    value={openaiKey}
                                    onChange={(e) => setOpenaiKey(e.target.value)}
                                    className="input input-bordered w-full bg-background text-foreground placeholder:text-muted-foreground"
                                    placeholder="sk-..."
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="btn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn btn-primary"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
} 