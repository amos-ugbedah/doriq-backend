// src/middlewares/admin.middleware.js

/**
 * Admin Middleware
 * ----------------
 * Restricts access to admin-only routes.
 * Must be used AFTER authMiddleware.
 */

export const adminMiddleware = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No user context found",
            });
        }

        const allowedRoles = ["admin", "superadmin"];

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Admin access required",
            });
        }

        next();
    } catch (error) {
        console.error("Admin Middleware Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error in admin authorization",
        });
    }
};