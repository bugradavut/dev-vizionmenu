"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PERMISSIONS = void 0;
exports.DEFAULT_PERMISSIONS = {
    owner: ["*"], // All permissions
    manager: [
        "menu:read",
        "menu:write",
        "orders:read",
        "orders:write",
        "reports:read",
        "staff:read",
        "staff:write",
        "settings:read",
        "settings:write",
    ],
    staff: ["menu:read", "orders:read", "orders:write"],
    viewer: ["menu:read", "orders:read", "reports:read"],
};
