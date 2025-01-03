import { useState, useEffect, ReactNode } from 'react';
import { APIKeyManager } from '@/services/api-key-manager';
import { Button } from './button';
import { Input } from './input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';

interface APIKeyDialogProps {
    onKeysChange?: () => void;
    children?: ReactNode;
}

export function APIKeyDialog({ onKeysChange, children }: APIKeyDialogProps) {
    const [anthropicKey, setAnthropicKey] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setAnthropicKey(APIKeyManager.getKey('anthropic') || '');
    }, [open]);

    const handleSave = () => {
        if (anthropicKey.trim()) {
            APIKeyManager.setKey('anthropic', anthropicKey.trim());
        } else {
            APIKeyManager.removeKey('anthropic');
        }

        onKeysChange?.();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button variant="outline">Manage API Keys</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>API Keys</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="anthropic-key" className="text-sm font-medium">
                            Anthropic API Key
                        </label>
                        <Input
                            id="anthropic-key"
                            type="password"
                            value={anthropicKey}
                            onChange={(e) => setAnthropicKey(e.target.value)}
                            placeholder="Enter your Anthropic API key"
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
} 