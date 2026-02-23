import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { XMarkIcon, ShareIcon, ArrowRightOnRectangleIcon, CheckIcon } from '@heroicons/react/24/outline';

const SyncModal = ({ isOpen, onClose }) => {
    const { syncId, setDeviceSyncId } = usePlayer();
    const [joinId, setJoinId] = useState('');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(syncId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJoin = (e) => {
        e.preventDefault();
        if (joinId.trim() && joinId.trim() !== syncId) {
            setDeviceSyncId(joinId.trim());
            setJoinId('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-md shadow-2xl overflow-hidden relative">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShareIcon className="w-6 h-6 text-blue-400" />
                        Device Sync
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Current Device Hub */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            Your Sync ID
                        </label>
                        <p className="text-xs text-gray-500">
                            Use this ID on another device to sync your playback and favorites here.
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white font-mono text-center tracking-widest text-lg">
                                {syncId}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="flex items-center justify-center p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors w-12 h-12"
                                title="Copy Sync ID"
                            >
                                {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ShareIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-[#1a1a1a] text-gray-500 font-medium">OR</span>
                        </div>
                    </div>

                    {/* Join Hub */}
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                                Link to Another Device
                            </label>
                            <p className="text-xs text-gray-500">
                                Enter the Sync ID from your other device to connect.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="e.g. sync-abcd1234"
                                value={joinId}
                                onChange={(e) => setJoinId(e.target.value)}
                                className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-colors placeholder-gray-600 font-mono"
                            />
                            <button
                                type="submit"
                                disabled={!joinId.trim() || joinId.trim() === syncId}
                                className="px-6 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Connect <ArrowRightOnRectangleIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SyncModal;
