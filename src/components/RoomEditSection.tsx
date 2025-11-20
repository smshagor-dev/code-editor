import { useState, useEffect, ChangeEvent } from "react";
import { useAppContext } from "@/context/AppContext";
import { useSocket } from "@/context/SocketContext";
import { SocketEvent } from "@/types/socket";
import { RoomInfo, RoomEditRequest, RoomOwnerCheckResponse } from "@/types/room";

interface RoomEditSectionProps {
    roomInfo: RoomInfo | null;
    onRoomUpdate?: () => void;
}

function RoomEditSection({ roomInfo, onRoomUpdate }: RoomEditSectionProps) {
    const { currentUser } = useAppContext();
    const { socket } = useSocket();

    const [isOwner, setIsOwner] = useState(false);
    const [isCheckingOwner, setIsCheckingOwner] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [roomName, setRoomName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [reason, setReason] = useState("");

    // Local state for toggles - synchronized with roomInfo
    const [isActive, setIsActive] = useState(false);

    // Delete confirmation states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteRoomName, setDeleteRoomName] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteReason, setDeleteReason] = useState("");

    // Check if user is room owner when component mounts or roomInfo changes
    useEffect(() => {
        if (roomInfo && currentUser.username) {
            checkRoomOwner();
        }
    }, [roomInfo, currentUser.username]);

    // Initialize form with current room info - SINGLE SOURCE OF TRUTH
    useEffect(() => {
        if (roomInfo) {
            setRoomName(roomInfo.room_name);
            setIsActive(roomInfo.is_active);
            console.log("[RoomEditSection] Room info initialized:", {
                name: roomInfo.room_name,
                active: roomInfo.is_active,
                deleted: roomInfo.is_delete
            });
        }
    }, [roomInfo]);

    const checkRoomOwner = () => {
        if (!roomInfo?.room_id || !currentUser.username) return;

        setIsCheckingOwner(true);
        socket.emit(SocketEvent.ROOM_OWNER_CHECK, { roomId: roomInfo.room_id });
    };

    const handleUpdateRoomName = async () => {
        if (!roomInfo || !currentUser.username || !roomName.trim()) return;

        if (roomName === roomInfo.room_name) {
            alert("Room name is the same as current!");
            return;
        }

        setIsSaving(true);

        const editRequest: RoomEditRequest = {
            roomId: roomInfo.room_id,
            roomName: roomName.trim(),
            reason: reason || "Room name updated"
        };

        console.log("[RoomEditSection] Sending room name update:", editRequest);
        socket.emit(SocketEvent.EDIT_ROOM_REQUEST, editRequest);
    };

    const handleUpdatePassword = async () => {
        if (!roomInfo || !currentUser.username) return;

        // Validate passwords
        if (!newPassword.trim()) {
            alert("Please enter a new password!");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setIsSaving(true);

        const editRequest: RoomEditRequest = {
            roomId: roomInfo.room_id,
            password: newPassword,
            reason: reason || "Password updated"
        };

        console.log("[RoomEditSection] Sending password update:", editRequest);
        socket.emit(SocketEvent.EDIT_ROOM_REQUEST, editRequest);
    };

    const handleRemovePassword = async () => {
        if (!roomInfo || !currentUser.username) return;

        if (!currentPassword) {
            alert("Please enter current password to remove password protection!");
            return;
        }

        setIsSaving(true);

        const editRequest: RoomEditRequest = {
            roomId: roomInfo.room_id,
            password: null,
            reason: reason || "Password protection removed"
        };

        console.log("[RoomEditSection] Sending remove password:", editRequest);
        socket.emit(SocketEvent.EDIT_ROOM_REQUEST, editRequest);
    };

    const handleToggleActiveStatus = async () => {
        if (!roomInfo || !currentUser.username || isSaving) return;

        const newActiveStatus = !isActive;
        const action = newActiveStatus ? "activate" : "deactivate";
        console.log("[RoomEditSection] Toggling active status from", isActive, "to", newActiveStatus);

        if (!window.confirm(`Are you sure you want to ${action} this room?`)) {
            return;
        }

        setIsSaving(true);

        // Optimistically update UI for better UX
        setIsActive(newActiveStatus);

        const editRequest: RoomEditRequest = {
            roomId: roomInfo.room_id,
            isActive: newActiveStatus,
            reason: reason || `Room ${action}d by owner`
        };

        console.log("[RoomEditSection] Sending active status change:", editRequest);
        socket.emit(SocketEvent.EDIT_ROOM_REQUEST, editRequest);
    };

    const handleShowDeleteConfirm = () => {
        if (!roomInfo) return;
        setShowDeleteConfirm(true);
        setDeleteRoomName("");
        setDeletePassword("");
        setDeleteReason("");
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setDeleteRoomName("");
        setDeletePassword("");
        setDeleteReason("");
    };

    const handleConfirmDelete = async () => {
        if (!roomInfo || !currentUser.username) return;

        // Validate delete confirmation
        if (deleteRoomName !== roomInfo.room_name) {
            alert("Room name does not match!");
            return;
        }

        if (!deletePassword) {
            alert("Please enter your password to confirm deletion!");
            return;
        }

        setIsSaving(true);
        setShowDeleteConfirm(false);

        const editRequest: RoomEditRequest = {
            roomId: roomInfo.room_id,
            isDelete: true,
            reason: deleteReason || "Room deleted by owner"
        };

        console.log("[RoomEditSection] Sending delete request:", editRequest);
        socket.emit(SocketEvent.EDIT_ROOM_REQUEST, editRequest);
    };

    const handleRestoreRoom = async () => {
        if (!roomInfo || !currentUser.username) return;

        if (!window.confirm("Are you sure you want to restore this room?")) {
            return;
        }

        setIsSaving(true);

        const editRequest: RoomEditRequest = {
            roomId: roomInfo.room_id,
            isDelete: false,
            reason: reason || "Room restored by owner"
        };

        console.log("[RoomEditSection] Sending restore request:", editRequest);
        socket.emit(SocketEvent.EDIT_ROOM_REQUEST, editRequest);
    };

    const resetForm = () => {
        setNewPassword("");
        setConfirmPassword("");
        setCurrentPassword("");
        setReason("");
        setIsSaving(false);
    };

    // Socket event listeners
    useEffect(() => {
        const handleRoomOwnerResponse = (data: RoomOwnerCheckResponse) => {
            setIsCheckingOwner(false);
            setIsOwner(data.isOwner);
            console.log("[RoomEditSection] Room owner response:", data);
        };

        const handleEditRoomResponse = (data: any) => {
            console.log("[RoomEditSection] Edit room response:", data);
            setIsSaving(false);

            if (data.success) {
                resetForm();

                if (data.roomInfo) {
                    setIsActive(data.roomInfo.is_active);
                    setRoomName(data.roomInfo.room_name);
                    console.log("[RoomEditSection] State updated from response:", {
                        active: data.roomInfo.is_active,
                        name: data.roomInfo.room_name
                    });
                }

                if (onRoomUpdate) {
                    onRoomUpdate();
                }

                // Show success message
                alert(data.message || "Room updated successfully!");
            } else {
                alert(data.message || "Failed to update room");
                if (roomInfo) {
                    setIsActive(roomInfo.is_active);
                    setRoomName(roomInfo.room_name);
                    console.log("[RoomEditSection] Reset state due to failure:", {
                        active: roomInfo.is_active,
                        name: roomInfo.room_name
                    });
                }
            }
        };

        socket.on(SocketEvent.ROOM_OWNER_RESPONSE, handleRoomOwnerResponse);
        socket.on(SocketEvent.EDIT_ROOM_RESPONSE, handleEditRoomResponse);

        return () => {
            socket.off(SocketEvent.ROOM_OWNER_RESPONSE, handleRoomOwnerResponse);
            socket.off(SocketEvent.EDIT_ROOM_RESPONSE, handleEditRoomResponse);
        };
    }, [socket, onRoomUpdate, roomInfo]);

    if (!roomInfo) return null;

    if (isCheckingOwner) {
        return (
            <div className="w-full rounded-lg border border-gray-700 bg-darkHover p-4">
                <div className="flex items-center justify-center gap-2 py-4 text-yellow-400">
                    <div className="h-2 w-2 animate-ping rounded-full bg-yellow-400"></div>
                    Checking room ownership...
                </div>
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="w-full rounded-lg border border-gray-700 bg-darkHover p-4">
                <div className="text-center py-4 text-gray-400">
                    Room management options are only available for the room owner.
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-darkHover border border-gray-700 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-white mb-4">Confirm Room Deletion</h3>

                        <div className="space-y-4">
                            <div className="text-sm text-gray-300">
                                This action cannot be undone. Please confirm by entering the required information.
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">
                                    Type the room name to confirm: <span className="font-medium text-white">{roomInfo.room_name}</span>
                                </label>
                                <input
                                    type="text"
                                    value={deleteRoomName}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDeleteRoomName(e.target.value)}
                                    placeholder={`Type "${roomInfo.room_name}" to confirm`}
                                    className="w-full rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-red-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Enter your password to confirm</label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDeletePassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-red-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Reason for deletion (optional)</label>
                                <textarea
                                    value={deleteReason}
                                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDeleteReason(e.target.value)}
                                    placeholder="Why are you deleting this room?"
                                    rows={2}
                                    className="w-full rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-red-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleCancelDelete}
                                    className="flex-1 rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={isSaving || deleteRoomName !== roomInfo.room_name || !deletePassword}
                                    className="flex-1 rounded-md bg-red-500/20 px-4 py-2 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                                >
                                    {isSaving ? "Deleting..." : "Delete Room"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full rounded-lg border border-gray-700 bg-darkHover p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Room Management</h3>

                <div className="space-y-6">
                    {/* Room Name Update */}
                    <div className="space-y-3">
                        <h4 className="text-md font-medium text-white border-b border-gray-600 pb-2">Change Room Name</h4>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">Current:</span>
                                <span className="text-white font-medium">{roomInfo.room_name}</span>
                            </div>
                            <input
                                type="text"
                                value={roomName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setRoomName(e.target.value)}
                                placeholder="Enter new room name"
                                className="rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-primary"
                            />
                        </div>
                        <button
                            onClick={handleUpdateRoomName}
                            disabled={isSaving || !roomName.trim() || roomName === roomInfo.room_name}
                            className="rounded-md bg-blue-500/20 px-4 py-2 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                        >
                            {isSaving ? "Updating..." : "Update Room Name"}
                        </button>
                    </div>

                    {/* Password Management */}
                    <div className="space-y-3">
                        <h4 className="text-md font-medium text-white border-b border-gray-600 pb-2">Password Management</h4>

                        {/* Update Password */}
                        <div className="space-y-2">
                            <h5 className="text-sm text-gray-300">Set New Password</h5>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-primary"
                            />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-primary"
                            />
                            <button
                                onClick={handleUpdatePassword}
                                disabled={isSaving || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                                className="rounded-md bg-green-500/20 px-4 py-2 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                            >
                                {isSaving ? "Updating..." : "Update Password"}
                            </button>
                        </div>

                        {/* Remove Password - Only show if room has password */}
                        {roomInfo.has_password && (
                            <div className="space-y-2 pt-4 border-t border-gray-600">
                                <h5 className="text-sm text-gray-300">Remove Password Protection</h5>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password to remove protection"
                                    className="w-full rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-primary"
                                />
                                <button
                                    onClick={handleRemovePassword}
                                    disabled={isSaving || !currentPassword}
                                    className="rounded-md bg-red-500/20 px-4 py-2 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                                >
                                    {isSaving ? "Removing..." : "Remove Password"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Room Status Management */}
                    <div className="space-y-3">
                        <h4 className="text-md font-medium text-white border-b border-gray-600 pb-2">Room Status</h4>

                        {/* Active Status Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-white">
                                    {isActive ? "Deactivate this room" : "Activate this room"}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {isActive ? "Room is currently active and accessible to users" : "Room is currently inactive and hidden from users"}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium ${isActive ? "text-green-400" : "text-red-400"}`}>
                                    {isActive ? "ACTIVE" : "INACTIVE"}
                                </span>
                                <button
                                    onClick={handleToggleActiveStatus}
                                    disabled={isSaving}
                                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-green-500' : 'bg-red-500'
                                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Delete/Restore */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-white">Delete Room</span>
                                <span className="text-xs text-gray-400">
                                    {roomInfo.is_delete ? "Room is currently deleted" : "Permanently delete this room"}
                                </span>
                            </div>
                            {roomInfo.is_delete ? (
                                <button
                                    onClick={handleRestoreRoom}
                                    disabled={isSaving}
                                    className="rounded-md bg-green-500/20 px-4 py-2 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                                >
                                    {isSaving ? "Restoring..." : "Restore Room"}
                                </button>
                            ) : (
                                <button
                                    onClick={handleShowDeleteConfirm}
                                    disabled={isSaving}
                                    className="rounded-md bg-red-500/20 px-4 py-2 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                                >
                                    Delete Room
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Reason for Changes */}
                    <div className="space-y-2">
                        <h4 className="text-md font-medium text-white border-b border-gray-600 pb-2">Reason for Changes (Optional)</h4>
                        <textarea
                            value={reason}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                            placeholder="Explain why you're making these changes..."
                            rows={2}
                            className="w-full rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-primary resize-none"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export default RoomEditSection;