/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("@nestjs/swagger");

/***/ }),
/* 4 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(5);
const throttler_1 = __webpack_require__(6);
const cache_manager_1 = __webpack_require__(7);
const app_controller_1 = __webpack_require__(8);
const app_service_1 = __webpack_require__(9);
const auth_module_1 = __webpack_require__(10);
const restaurant_module_1 = __webpack_require__(26);
const menu_module_1 = __webpack_require__(31);
const order_module_1 = __webpack_require__(34);
const database_module_1 = __webpack_require__(37);
const queue_module_1 = __webpack_require__(38);
const configuration_1 = __webpack_require__(42);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.configuration],
                envFilePath: [".env.local", ".env"],
            }),
            database_module_1.DatabaseModule,
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: "short",
                    ttl: 1000,
                    limit: 10,
                },
                {
                    name: "medium",
                    ttl: 10000,
                    limit: 100,
                },
                {
                    name: "long",
                    ttl: 60000,
                    limit: 1000,
                },
            ]),
            cache_manager_1.CacheModule.register({
                isGlobal: true,
                ttl: 60000,
            }),
            queue_module_1.QueueModule,
            auth_module_1.AuthModule,
            restaurant_module_1.RestaurantModule,
            menu_module_1.MenuModule,
            order_module_1.OrderModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);


/***/ }),
/* 5 */
/***/ ((module) => {

module.exports = require("@nestjs/config");

/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("@nestjs/throttler");

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("@nestjs/cache-manager");

/***/ }),
/* 8 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppController = void 0;
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(3);
const app_service_1 = __webpack_require__(9);
let AppController = class AppController {
    appService;
    constructor(appService) {
        this.appService = appService;
    }
    getHello() {
        return this.appService.getHello();
    }
    getHealthStatus() {
        return this.appService.getHealthStatus();
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "Health check endpoint" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "API is running" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)("health"),
    (0, swagger_1.ApiOperation)({ summary: "Detailed health check" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Health status" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getHealthStatus", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiTags)("health"),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [typeof (_a = typeof app_service_1.AppService !== "undefined" && app_service_1.AppService) === "function" ? _a : Object])
], AppController);


/***/ }),
/* 9 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppService = void 0;
const common_1 = __webpack_require__(2);
let AppService = class AppService {
    getHello() {
        return "Vision Menu API is running! 🚀";
    }
    getHealthStatus() {
        return {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
            version: "1.0.0",
        };
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)()
], AppService);


/***/ }),
/* 10 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthModule = void 0;
const common_1 = __webpack_require__(2);
const jwt_1 = __webpack_require__(11);
const passport_1 = __webpack_require__(12);
const config_1 = __webpack_require__(5);
const auth_controller_1 = __webpack_require__(13);
const auth_service_1 = __webpack_require__(14);
const jwt_strategy_1 = __webpack_require__(22);
const local_strategy_1 = __webpack_require__(24);
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    secret: configService.get("jwt.secret"),
                    signOptions: {
                        expiresIn: configService.get("jwt.expiresIn"),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, local_strategy_1.LocalStrategy],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);


/***/ }),
/* 11 */
/***/ ((module) => {

module.exports = require("@nestjs/jwt");

/***/ }),
/* 12 */
/***/ ((module) => {

module.exports = require("@nestjs/passport");

/***/ }),
/* 13 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthController = void 0;
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(3);
const auth_service_1 = __webpack_require__(14);
const public_decorator_1 = __webpack_require__(18);
const current_user_decorator_1 = __webpack_require__(19);
const jwt_auth_guard_1 = __webpack_require__(20);
const types_1 = __webpack_require__(21);
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto) {
        return this.authService.login(loginDto);
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async forgotPassword(forgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto);
    }
    async resetPassword(resetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto);
    }
    async changePassword(user, changePasswordDto) {
        return this.authService.changePassword(user.id, changePasswordDto);
    }
    async getProfile(user) {
        return this.authService.getProfile(user.id);
    }
    async logout(user) {
        return this.authService.logout(user.id);
    }
    async refreshToken(user) {
        return this.authService.refreshToken(user.id);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)("login"),
    (0, swagger_1.ApiOperation)({ summary: "Login user" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "User logged in successfully" }),
    (0, swagger_1.ApiResponse)({ status: 401, description: "Invalid credentials" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof types_1.LoginRequest !== "undefined" && types_1.LoginRequest) === "function" ? _b : Object]),
    __metadata("design:returntype", typeof (_c = typeof Promise !== "undefined" && Promise) === "function" ? _c : Object)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)("register"),
    (0, swagger_1.ApiOperation)({ summary: "Register new user" }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "User registered successfully" }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Registration failed" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof types_1.RegisterRequest !== "undefined" && types_1.RegisterRequest) === "function" ? _d : Object]),
    __metadata("design:returntype", typeof (_e = typeof Promise !== "undefined" && Promise) === "function" ? _e : Object)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)("forgot-password"),
    (0, swagger_1.ApiOperation)({ summary: "Send forgot password email" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Reset email sent" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_f = typeof types_1.ForgotPasswordRequest !== "undefined" && types_1.ForgotPasswordRequest) === "function" ? _f : Object]),
    __metadata("design:returntype", typeof (_g = typeof Promise !== "undefined" && Promise) === "function" ? _g : Object)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)("reset-password"),
    (0, swagger_1.ApiOperation)({ summary: "Reset password with token" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Password reset successfully" }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Invalid or expired token" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_h = typeof types_1.ResetPasswordRequest !== "undefined" && types_1.ResetPasswordRequest) === "function" ? _h : Object]),
    __metadata("design:returntype", typeof (_j = typeof Promise !== "undefined" && Promise) === "function" ? _j : Object)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)("change-password"),
    (0, swagger_1.ApiOperation)({ summary: "Change user password" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Password changed successfully" }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Current password incorrect" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_k = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _k : Object, typeof (_l = typeof types_1.ChangePasswordRequest !== "undefined" && types_1.ChangePasswordRequest) === "function" ? _l : Object]),
    __metadata("design:returntype", typeof (_m = typeof Promise !== "undefined" && Promise) === "function" ? _m : Object)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)("profile"),
    (0, swagger_1.ApiOperation)({ summary: "Get current user profile" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "User profile" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_o = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _o : Object]),
    __metadata("design:returntype", typeof (_p = typeof Promise !== "undefined" && Promise) === "function" ? _p : Object)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)("logout"),
    (0, swagger_1.ApiOperation)({ summary: "Logout user" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "User logged out successfully" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_q = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _q : Object]),
    __metadata("design:returntype", typeof (_r = typeof Promise !== "undefined" && Promise) === "function" ? _r : Object)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)("refresh"),
    (0, swagger_1.ApiOperation)({ summary: "Refresh access token" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Token refreshed successfully" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_s = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _s : Object]),
    __metadata("design:returntype", typeof (_t = typeof Promise !== "undefined" && Promise) === "function" ? _t : Object)
], AuthController.prototype, "refreshToken", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)("auth"),
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [typeof (_a = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _a : Object])
], AuthController);


/***/ }),
/* 14 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthService = void 0;
const common_1 = __webpack_require__(2);
const jwt_1 = __webpack_require__(11);
const config_1 = __webpack_require__(5);
const bcrypt = __importStar(__webpack_require__(15));
const database_service_1 = __webpack_require__(16);
let AuthService = class AuthService {
    jwtService;
    configService;
    databaseService;
    constructor(jwtService, configService, databaseService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.databaseService = databaseService;
    }
    async login(loginDto) {
        const { email, password, restaurant_slug } = loginDto;
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: user, error: userError } = await supabase
                .from("users")
                .select("*")
                .eq("email", email)
                .single();
            if (userError || !user) {
                throw new common_1.UnauthorizedException("Invalid credentials");
            }
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException("Invalid credentials");
            }
            let restaurantQuery = supabase
                .from("restaurant_users")
                .select(`
          *,
          restaurant:restaurants(id, name, slug)
        `)
                .eq("user_id", user.id);
            if (restaurant_slug) {
                restaurantQuery = restaurantQuery.eq("restaurant.slug", restaurant_slug);
            }
            const { data: restaurantUsers, error: restaurantError } = await restaurantQuery;
            if (restaurantError || !restaurantUsers?.length) {
                throw new common_1.UnauthorizedException("User not associated with any restaurant");
            }
            const restaurantUser = restaurantUsers[0];
            const payload = {
                sub: user.id,
                email: user.email,
                restaurant_id: restaurantUser.restaurant_id,
                role: restaurantUser.role,
                permissions: restaurantUser.permissions,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
            };
            const access_token = this.jwtService.sign(payload);
            const refresh_token = this.jwtService.sign({ sub: user.id, type: "refresh" }, { expiresIn: this.configService.get("jwt.refreshExpiresIn") });
            await supabase
                .from("users")
                .update({ last_login_at: new Date().toISOString() })
                .eq("id", user.id);
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                    avatar_url: user.avatar_url,
                    is_active: user.is_active,
                    email_verified: user.email_verified,
                    phone_verified: user.phone_verified,
                    last_login_at: user.last_login_at,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                },
                session: {
                    user: {
                        id: user.id,
                        email: user.email,
                        full_name: user.full_name,
                        phone: user.phone,
                        avatar_url: user.avatar_url,
                        is_active: user.is_active,
                        email_verified: user.email_verified,
                        phone_verified: user.phone_verified,
                        last_login_at: user.last_login_at,
                        created_at: user.created_at,
                        updated_at: user.updated_at,
                    },
                    restaurant_id: restaurantUser.restaurant_id,
                    role: restaurantUser.role,
                    permissions: restaurantUser.permissions,
                    access_token,
                    refresh_token,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                },
                restaurant: {
                    id: restaurantUser.restaurant.id,
                    name: restaurantUser.restaurant.name,
                    slug: restaurantUser.restaurant.slug,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.BadRequestException("Login failed");
        }
    }
    async register(registerDto) {
        const { email, password, full_name, phone, restaurant_name, restaurant_slug, } = registerDto;
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: existingUser } = await supabase
                .from("users")
                .select("id")
                .eq("email", email)
                .single();
            if (existingUser) {
                throw new common_1.BadRequestException("User already exists");
            }
            const { data: existingRestaurant } = await supabase
                .from("restaurants")
                .select("id")
                .eq("slug", restaurant_slug)
                .single();
            if (existingRestaurant) {
                throw new common_1.BadRequestException("Restaurant slug is already taken");
            }
            const password_hash = await bcrypt.hash(password, 10);
            const { data: user, error: userError } = await supabase
                .from("users")
                .insert({
                email,
                password_hash,
                full_name,
                phone,
                is_active: true,
                email_verified: false,
                phone_verified: false,
            })
                .select()
                .single();
            if (userError) {
                throw new common_1.BadRequestException("Failed to create user");
            }
            const { data: restaurant, error: restaurantError } = await supabase
                .from("restaurants")
                .insert({
                name: restaurant_name,
                slug: restaurant_slug,
                settings: {
                    currency: "USD",
                    tax_rate: 0.1,
                    service_fee: 0.0,
                    min_order_amount: 0,
                    max_delivery_distance: 10,
                    delivery_fee: 2.99,
                    pickup_enabled: true,
                    delivery_enabled: true,
                    table_service_enabled: true,
                    qr_ordering_enabled: true,
                    online_payments_enabled: true,
                    third_party_integration_enabled: false,
                },
            })
                .select()
                .single();
            if (restaurantError) {
                throw new common_1.BadRequestException("Failed to create restaurant");
            }
            const { error: associationError } = await supabase
                .from("restaurant_users")
                .insert({
                user_id: user.id,
                restaurant_id: restaurant.id,
                role: "owner",
                permissions: ["*"],
            });
            if (associationError) {
                throw new common_1.BadRequestException("Failed to associate user with restaurant");
            }
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                    avatar_url: user.avatar_url,
                    is_active: user.is_active,
                    email_verified: user.email_verified,
                    phone_verified: user.phone_verified,
                    last_login_at: user.last_login_at,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                },
                restaurant: {
                    id: restaurant.id,
                    name: restaurant.name,
                    slug: restaurant.slug,
                },
                verification_required: true,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Registration failed");
        }
    }
    async forgotPassword(forgotPasswordDto) {
        return { message: "Password reset email sent" };
    }
    async resetPassword(resetPasswordDto) {
        return { message: "Password reset successfully" };
    }
    async changePassword(userId, changePasswordDto) {
        const { current_password, new_password } = changePasswordDto;
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: user, error: userError } = await supabase
                .from("users")
                .select("password_hash")
                .eq("id", userId)
                .single();
            if (userError || !user) {
                throw new common_1.BadRequestException("User not found");
            }
            const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);
            if (!isPasswordValid) {
                throw new common_1.BadRequestException("Current password is incorrect");
            }
            const new_password_hash = await bcrypt.hash(new_password, 10);
            const { error: updateError } = await supabase
                .from("users")
                .update({ password_hash: new_password_hash })
                .eq("id", userId);
            if (updateError) {
                throw new common_1.BadRequestException("Failed to update password");
            }
            return { message: "Password changed successfully" };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to change password");
        }
    }
    async getProfile(userId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: user, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();
            if (error || !user) {
                throw new common_1.BadRequestException("User not found");
            }
            return {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                avatar_url: user.avatar_url,
                is_active: user.is_active,
                email_verified: user.email_verified,
                phone_verified: user.phone_verified,
                last_login_at: user.last_login_at,
                created_at: user.created_at,
                updated_at: user.updated_at,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to get profile");
        }
    }
    async logout(userId) {
        return { message: "Logged out successfully" };
    }
    async refreshToken(userId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: restaurantUser, error } = await supabase
                .from("restaurant_users")
                .select(`
          *,
          user:users(*)
        `)
                .eq("user_id", userId)
                .single();
            if (error || !restaurantUser) {
                throw new common_1.UnauthorizedException("User not found");
            }
            const payload = {
                sub: restaurantUser.user.id,
                email: restaurantUser.user.email,
                restaurant_id: restaurantUser.restaurant_id,
                role: restaurantUser.role,
                permissions: restaurantUser.permissions,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
            };
            const access_token = this.jwtService.sign(payload);
            return { access_token };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to refresh token");
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object, typeof (_c = typeof database_service_1.DatabaseService !== "undefined" && database_service_1.DatabaseService) === "function" ? _c : Object])
], AuthService);


/***/ }),
/* 15 */
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),
/* 16 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DatabaseService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(5);
const supabase_js_1 = __webpack_require__(17);
let DatabaseService = class DatabaseService {
    configService;
    supabase;
    supabaseAdmin;
    constructor(configService) {
        this.configService = configService;
        this.supabase = (0, supabase_js_1.createClient)(this.configService.get("supabase.url"), this.configService.get("supabase.anonKey"));
        this.supabaseAdmin = (0, supabase_js_1.createClient)(this.configService.get("supabase.url"), this.configService.get("supabase.serviceRoleKey"));
    }
    getClient() {
        return this.supabase;
    }
    getAdminClient() {
        return this.supabaseAdmin;
    }
    setAuthToken(token) {
        return (0, supabase_js_1.createClient)(this.configService.get("supabase.url"), this.configService.get("supabase.anonKey"), {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });
    }
    getUserClient(authToken) {
        return this.setAuthToken(authToken);
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], DatabaseService);


/***/ }),
/* 17 */
/***/ ((module) => {

module.exports = require("@supabase/supabase-js");

/***/ }),
/* 18 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Public = exports.IS_PUBLIC_KEY = void 0;
const common_1 = __webpack_require__(2);
exports.IS_PUBLIC_KEY = "isPublic";
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;


/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CurrentUser = void 0;
const common_1 = __webpack_require__(2);
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
});


/***/ }),
/* 20 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtAuthGuard = void 0;
const common_1 = __webpack_require__(2);
const passport_1 = __webpack_require__(12);
const core_1 = __webpack_require__(1);
let JwtAuthGuard = class JwtAuthGuard extends (0, passport_1.AuthGuard)("jwt") {
    reflector;
    constructor(reflector) {
        super();
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.get("isPublic", context.getHandler());
        if (isPublic) {
            return true;
        }
        return super.canActivate(context);
    }
    handleRequest(err, user, info, context) {
        if (err || !user) {
            throw err || new common_1.UnauthorizedException("Invalid or expired token");
        }
        return user;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _a : Object])
], JwtAuthGuard);


/***/ }),
/* 21 */
/***/ ((module) => {

module.exports = require("@vision-menu/types");

/***/ }),
/* 22 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtStrategy = void 0;
const common_1 = __webpack_require__(2);
const passport_1 = __webpack_require__(12);
const config_1 = __webpack_require__(5);
const passport_jwt_1 = __webpack_require__(23);
const database_service_1 = __webpack_require__(16);
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    configService;
    databaseService;
    constructor(configService, databaseService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get("jwt.secret"),
        });
        this.configService = configService;
        this.databaseService = databaseService;
    }
    async validate(payload) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: user, error: userError } = await supabase
                .from("users")
                .select("*")
                .eq("id", payload.sub)
                .single();
            if (userError || !user || !user.is_active) {
                throw new common_1.UnauthorizedException("User not found or inactive");
            }
            const { data: restaurantUser, error: restaurantError } = await supabase
                .from("restaurant_users")
                .select(`
          *,
          restaurant:restaurants(*)
        `)
                .eq("user_id", payload.sub)
                .eq("restaurant_id", payload.restaurant_id)
                .single();
            if (restaurantError || !restaurantUser) {
                throw new common_1.UnauthorizedException("Restaurant association not found");
            }
            return {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                avatar_url: user.avatar_url,
                is_active: user.is_active,
                email_verified: user.email_verified,
                phone_verified: user.phone_verified,
                last_login_at: user.last_login_at,
                created_at: user.created_at,
                updated_at: user.updated_at,
                restaurant_id: restaurantUser.restaurant_id,
                role: restaurantUser.role,
                permissions: restaurantUser.permissions,
                restaurant: restaurantUser.restaurant,
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException("Invalid token");
        }
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object, typeof (_b = typeof database_service_1.DatabaseService !== "undefined" && database_service_1.DatabaseService) === "function" ? _b : Object])
], JwtStrategy);


/***/ }),
/* 23 */
/***/ ((module) => {

module.exports = require("passport-jwt");

/***/ }),
/* 24 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LocalStrategy = void 0;
const common_1 = __webpack_require__(2);
const passport_1 = __webpack_require__(12);
const passport_local_1 = __webpack_require__(25);
const auth_service_1 = __webpack_require__(14);
let LocalStrategy = class LocalStrategy extends (0, passport_1.PassportStrategy)(passport_local_1.Strategy) {
    authService;
    constructor(authService) {
        super({
            usernameField: "email",
            passwordField: "password",
        });
        this.authService = authService;
    }
    async validate(email, password) {
        try {
            const result = await this.authService.login({ email, password });
            return result.user;
        }
        catch (error) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
    }
};
exports.LocalStrategy = LocalStrategy;
exports.LocalStrategy = LocalStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _a : Object])
], LocalStrategy);


/***/ }),
/* 25 */
/***/ ((module) => {

module.exports = require("passport-local");

/***/ }),
/* 26 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RestaurantModule = void 0;
const common_1 = __webpack_require__(2);
const restaurant_controller_1 = __webpack_require__(27);
const restaurant_service_1 = __webpack_require__(28);
let RestaurantModule = class RestaurantModule {
};
exports.RestaurantModule = RestaurantModule;
exports.RestaurantModule = RestaurantModule = __decorate([
    (0, common_1.Module)({
        controllers: [restaurant_controller_1.RestaurantController],
        providers: [restaurant_service_1.RestaurantService],
        exports: [restaurant_service_1.RestaurantService],
    })
], RestaurantModule);


/***/ }),
/* 27 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RestaurantController = void 0;
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(3);
const restaurant_service_1 = __webpack_require__(28);
const jwt_auth_guard_1 = __webpack_require__(20);
const restaurant_role_guard_1 = __webpack_require__(29);
const current_user_decorator_1 = __webpack_require__(19);
const roles_decorator_1 = __webpack_require__(30);
const types_1 = __webpack_require__(21);
let RestaurantController = class RestaurantController {
    restaurantService;
    constructor(restaurantService) {
        this.restaurantService = restaurantService;
    }
    async getRestaurant(user) {
        return this.restaurantService.getRestaurant(user.restaurant_id);
    }
    async updateRestaurant(user, updateRestaurantDto) {
        return this.restaurantService.updateRestaurant(user.restaurant_id, updateRestaurantDto);
    }
    async getRestaurantStats(user) {
        return this.restaurantService.getRestaurantStats(user.restaurant_id);
    }
    async getRestaurantUsers(user) {
        return this.restaurantService.getRestaurantUsers(user.restaurant_id);
    }
    async inviteUser(user, inviteDto) {
        return this.restaurantService.inviteUser(user.restaurant_id, inviteDto);
    }
    async removeUser(user, userId) {
        return this.restaurantService.removeUser(user.restaurant_id, userId);
    }
};
exports.RestaurantController = RestaurantController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "Get current restaurant details" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Restaurant details" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _b : Object]),
    __metadata("design:returntype", typeof (_c = typeof Promise !== "undefined" && Promise) === "function" ? _c : Object)
], RestaurantController.prototype, "getRestaurant", null);
__decorate([
    (0, common_1.Patch)(),
    (0, roles_decorator_1.Roles)("owner", "manager"),
    (0, swagger_1.ApiOperation)({ summary: "Update restaurant details" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Restaurant updated successfully" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _d : Object, typeof (_e = typeof Partial !== "undefined" && Partial) === "function" ? _e : Object]),
    __metadata("design:returntype", typeof (_f = typeof Promise !== "undefined" && Promise) === "function" ? _f : Object)
], RestaurantController.prototype, "updateRestaurant", null);
__decorate([
    (0, common_1.Get)("stats"),
    (0, roles_decorator_1.Roles)("owner", "manager"),
    (0, swagger_1.ApiOperation)({ summary: "Get restaurant statistics" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Restaurant statistics" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_g = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _g : Object]),
    __metadata("design:returntype", typeof (_h = typeof Promise !== "undefined" && Promise) === "function" ? _h : Object)
], RestaurantController.prototype, "getRestaurantStats", null);
__decorate([
    (0, common_1.Get)("users"),
    (0, roles_decorator_1.Roles)("owner", "manager"),
    (0, swagger_1.ApiOperation)({ summary: "Get restaurant users" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Restaurant users" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_j = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _j : Object]),
    __metadata("design:returntype", Promise)
], RestaurantController.prototype, "getRestaurantUsers", null);
__decorate([
    (0, common_1.Post)("users/invite"),
    (0, roles_decorator_1.Roles)("owner", "manager"),
    (0, swagger_1.ApiOperation)({ summary: "Invite user to restaurant" }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "User invited successfully" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_k = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _k : Object, Object]),
    __metadata("design:returntype", Promise)
], RestaurantController.prototype, "inviteUser", null);
__decorate([
    (0, common_1.Delete)("users/:userId"),
    (0, roles_decorator_1.Roles)("owner"),
    (0, swagger_1.ApiOperation)({ summary: "Remove user from restaurant" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "User removed successfully" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_l = typeof types_1.User !== "undefined" && types_1.User) === "function" ? _l : Object, String]),
    __metadata("design:returntype", Promise)
], RestaurantController.prototype, "removeUser", null);
exports.RestaurantController = RestaurantController = __decorate([
    (0, swagger_1.ApiTags)("restaurant"),
    (0, common_1.Controller)("restaurant"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [typeof (_a = typeof restaurant_service_1.RestaurantService !== "undefined" && restaurant_service_1.RestaurantService) === "function" ? _a : Object])
], RestaurantController);


/***/ }),
/* 28 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RestaurantService = void 0;
const common_1 = __webpack_require__(2);
const database_service_1 = __webpack_require__(16);
let RestaurantService = class RestaurantService {
    databaseService;
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async getRestaurant(restaurantId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: restaurant, error } = await supabase
                .from("restaurants")
                .select("*")
                .eq("id", restaurantId)
                .single();
            if (error || !restaurant) {
                throw new common_1.NotFoundException("Restaurant not found");
            }
            return restaurant;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to get restaurant");
        }
    }
    async updateRestaurant(restaurantId, updateData) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: restaurant, error } = await supabase
                .from("restaurants")
                .update({
                ...updateData,
                updated_at: new Date().toISOString(),
            })
                .eq("id", restaurantId)
                .select()
                .single();
            if (error) {
                throw new common_1.BadRequestException("Failed to update restaurant");
            }
            return restaurant;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to update restaurant");
        }
    }
    async getRestaurantStats(restaurantId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: orders, error: ordersError } = await supabase
                .from("orders")
                .select("total_amount, status, created_at")
                .eq("restaurant_id", restaurantId);
            if (ordersError) {
                throw new common_1.BadRequestException("Failed to get orders data");
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
            const todayOrders = orders.filter((order) => new Date(order.created_at) >= today).length;
            const todayRevenue = orders
                .filter((order) => new Date(order.created_at) >= today)
                .reduce((sum, order) => sum + order.total_amount, 0);
            const pendingOrders = orders.filter((order) => ["pending", "confirmed", "preparing"].includes(order.status)).length;
            return {
                total_orders: totalOrders,
                total_revenue: totalRevenue,
                avg_order_value: avgOrderValue,
                today_orders: todayOrders,
                today_revenue: todayRevenue,
                pending_orders: pendingOrders,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to get restaurant stats");
        }
    }
    async getRestaurantUsers(restaurantId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: users, error } = await supabase
                .from("restaurant_users")
                .select(`
          *,
          user:users(id, email, full_name, phone, avatar_url, is_active)
        `)
                .eq("restaurant_id", restaurantId);
            if (error) {
                throw new common_1.BadRequestException("Failed to get restaurant users");
            }
            return users;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to get restaurant users");
        }
    }
    async inviteUser(restaurantId, inviteDto) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: existingUser } = await supabase
                .from("users")
                .select("id")
                .eq("email", inviteDto.email)
                .single();
            if (existingUser) {
                const { data: existingAssociation } = await supabase
                    .from("restaurant_users")
                    .select("id")
                    .eq("user_id", existingUser.id)
                    .eq("restaurant_id", restaurantId)
                    .single();
                if (existingAssociation) {
                    throw new common_1.BadRequestException("User is already associated with this restaurant");
                }
                const { error } = await supabase.from("restaurant_users").insert({
                    user_id: existingUser.id,
                    restaurant_id: restaurantId,
                    role: inviteDto.role,
                    permissions: inviteDto.permissions,
                });
                if (error) {
                    throw new common_1.BadRequestException("Failed to add user to restaurant");
                }
                return { message: "User added to restaurant successfully" };
            }
            else {
                return { message: "Invitation sent successfully" };
            }
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to invite user");
        }
    }
    async removeUser(restaurantId, userId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { error } = await supabase
                .from("restaurant_users")
                .delete()
                .eq("user_id", userId)
                .eq("restaurant_id", restaurantId);
            if (error) {
                throw new common_1.BadRequestException("Failed to remove user from restaurant");
            }
            return { message: "User removed from restaurant successfully" };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to remove user");
        }
    }
};
exports.RestaurantService = RestaurantService;
exports.RestaurantService = RestaurantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof database_service_1.DatabaseService !== "undefined" && database_service_1.DatabaseService) === "function" ? _a : Object])
], RestaurantService);


/***/ }),
/* 29 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RestaurantRoleGuard = void 0;
const common_1 = __webpack_require__(2);
const core_1 = __webpack_require__(1);
let RestaurantRoleGuard = class RestaurantRoleGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredRoles = this.reflector.get("roles", context.getHandler());
        if (!requiredRoles) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException("User not authenticated");
        }
        if (!user.restaurant_id) {
            throw new common_1.ForbiddenException("User not associated with a restaurant");
        }
        if (!user.role) {
            throw new common_1.ForbiddenException("User role not defined");
        }
        if (user.role === "owner") {
            return true;
        }
        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            throw new common_1.ForbiddenException(`Required role: ${requiredRoles.join(", ")}. Current role: ${user.role}`);
        }
        return true;
    }
};
exports.RestaurantRoleGuard = RestaurantRoleGuard;
exports.RestaurantRoleGuard = RestaurantRoleGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _a : Object])
], RestaurantRoleGuard);


/***/ }),
/* 30 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Roles = exports.ROLES_KEY = void 0;
const common_1 = __webpack_require__(2);
exports.ROLES_KEY = "roles";
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;


/***/ }),
/* 31 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MenuModule = void 0;
const common_1 = __webpack_require__(2);
const menu_controller_1 = __webpack_require__(32);
const menu_service_1 = __webpack_require__(33);
let MenuModule = class MenuModule {
};
exports.MenuModule = MenuModule;
exports.MenuModule = MenuModule = __decorate([
    (0, common_1.Module)({
        controllers: [menu_controller_1.MenuController],
        providers: [menu_service_1.MenuService],
        exports: [menu_service_1.MenuService],
    })
], MenuModule);


/***/ }),
/* 32 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MenuController = void 0;
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(3);
const menu_service_1 = __webpack_require__(33);
const jwt_auth_guard_1 = __webpack_require__(20);
const restaurant_role_guard_1 = __webpack_require__(29);
const current_user_decorator_1 = __webpack_require__(19);
const roles_decorator_1 = __webpack_require__(30);
const public_decorator_1 = __webpack_require__(18);
let MenuController = class MenuController {
    menuService;
    constructor(menuService) {
        this.menuService = menuService;
    }
    async getPublicMenu(restaurantSlug) {
        return this.menuService.getPublicMenu(restaurantSlug);
    }
    async getMenu(user) {
        return this.menuService.getMenu(user.restaurant_id);
    }
    async createCategory(user, categoryData) {
        return this.menuService.createCategory(user.restaurant_id, categoryData);
    }
    async createItem(user, itemData) {
        return this.menuService.createItem(user.restaurant_id, itemData);
    }
    async updateItem(user, itemId, itemData) {
        return this.menuService.updateItem(user.restaurant_id, itemId, itemData);
    }
    async deleteItem(user, itemId) {
        return this.menuService.deleteItem(user.restaurant_id, itemId);
    }
};
exports.MenuController = MenuController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)("restaurant/:restaurantSlug"),
    (0, swagger_1.ApiOperation)({ summary: "Get public menu for restaurant" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Restaurant menu" }),
    __param(0, (0, common_1.Param)("restaurantSlug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "getPublicMenu", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "Get restaurant menu (admin)" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Restaurant menu" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "getMenu", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)("categories"),
    (0, roles_decorator_1.Roles)("owner", "manager"),
    (0, swagger_1.ApiOperation)({ summary: "Create menu category" }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "Category created successfully" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "createCategory", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)("items"),
    (0, roles_decorator_1.Roles)("owner", "manager"),
    (0, swagger_1.ApiOperation)({ summary: "Create menu item" }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "Item created successfully" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "createItem", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Patch)("items/:itemId"),
    (0, roles_decorator_1.Roles)("owner", "manager"),
    (0, swagger_1.ApiOperation)({ summary: "Update menu item" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Item updated successfully" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("itemId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "updateItem", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Delete)("items/:itemId"),
    (0, roles_decorator_1.Roles)("owner", "manager"),
    (0, swagger_1.ApiOperation)({ summary: "Delete menu item" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Item deleted successfully" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("itemId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "deleteItem", null);
exports.MenuController = MenuController = __decorate([
    (0, swagger_1.ApiTags)("menu"),
    (0, common_1.Controller)("menu"),
    __metadata("design:paramtypes", [typeof (_a = typeof menu_service_1.MenuService !== "undefined" && menu_service_1.MenuService) === "function" ? _a : Object])
], MenuController);


/***/ }),
/* 33 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MenuService = void 0;
const common_1 = __webpack_require__(2);
const database_service_1 = __webpack_require__(16);
let MenuService = class MenuService {
    databaseService;
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async getPublicMenu(restaurantSlug) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: restaurant, error: restaurantError } = await supabase
                .from("restaurants")
                .select("id, name, slug")
                .eq("slug", restaurantSlug)
                .single();
            if (restaurantError || !restaurant) {
                throw new common_1.NotFoundException("Restaurant not found");
            }
            const { data: menu, error: menuError } = await supabase
                .from("menus")
                .select(`
          *,
          categories:menu_categories(
            *,
            items:menu_items(
              *,
              variations:menu_item_variations(*),
              modifiers:menu_item_modifiers(
                *,
                options:modifier_options(*)
              )
            )
          )
        `)
                .eq("restaurant_id", restaurant.id)
                .eq("is_active", true)
                .order("display_order");
            if (menuError) {
                throw new common_1.BadRequestException("Failed to get menu");
            }
            return {
                restaurant,
                menu: menu || [],
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to get public menu");
        }
    }
    async getMenu(restaurantId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: menu, error } = await supabase
                .from("menus")
                .select(`
          *,
          categories:menu_categories(
            *,
            items:menu_items(
              *,
              variations:menu_item_variations(*),
              modifiers:menu_item_modifiers(
                *,
                options:modifier_options(*)
              )
            )
          )
        `)
                .eq("restaurant_id", restaurantId)
                .order("display_order");
            if (error) {
                throw new common_1.BadRequestException("Failed to get menu");
            }
            return menu;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to get menu");
        }
    }
    async createCategory(restaurantId, categoryData) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: category, error } = await supabase
                .from("menu_categories")
                .insert({
                ...categoryData,
                restaurant_id: restaurantId,
            })
                .select()
                .single();
            if (error) {
                throw new common_1.BadRequestException("Failed to create category");
            }
            return category;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to create category");
        }
    }
    async createItem(restaurantId, itemData) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: item, error } = await supabase
                .from("menu_items")
                .insert({
                ...itemData,
                restaurant_id: restaurantId,
            })
                .select()
                .single();
            if (error) {
                throw new common_1.BadRequestException("Failed to create item");
            }
            return item;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to create item");
        }
    }
    async updateItem(restaurantId, itemId, itemData) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: item, error } = await supabase
                .from("menu_items")
                .update({
                ...itemData,
                updated_at: new Date().toISOString(),
            })
                .eq("id", itemId)
                .eq("restaurant_id", restaurantId)
                .select()
                .single();
            if (error) {
                throw new common_1.BadRequestException("Failed to update item");
            }
            return item;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to update item");
        }
    }
    async deleteItem(restaurantId, itemId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { error } = await supabase
                .from("menu_items")
                .delete()
                .eq("id", itemId)
                .eq("restaurant_id", restaurantId);
            if (error) {
                throw new common_1.BadRequestException("Failed to delete item");
            }
            return { message: "Item deleted successfully" };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to delete item");
        }
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof database_service_1.DatabaseService !== "undefined" && database_service_1.DatabaseService) === "function" ? _a : Object])
], MenuService);


/***/ }),
/* 34 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrderModule = void 0;
const common_1 = __webpack_require__(2);
const order_controller_1 = __webpack_require__(35);
const order_service_1 = __webpack_require__(36);
let OrderModule = class OrderModule {
};
exports.OrderModule = OrderModule;
exports.OrderModule = OrderModule = __decorate([
    (0, common_1.Module)({
        controllers: [order_controller_1.OrderController],
        providers: [order_service_1.OrderService],
        exports: [order_service_1.OrderService],
    })
], OrderModule);


/***/ }),
/* 35 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrderController = void 0;
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(3);
const order_service_1 = __webpack_require__(36);
const jwt_auth_guard_1 = __webpack_require__(20);
const restaurant_role_guard_1 = __webpack_require__(29);
const current_user_decorator_1 = __webpack_require__(19);
const roles_decorator_1 = __webpack_require__(30);
const public_decorator_1 = __webpack_require__(18);
let OrderController = class OrderController {
    orderService;
    constructor(orderService) {
        this.orderService = orderService;
    }
    async createOrder(orderData) {
        return this.orderService.createOrder(orderData);
    }
    async getOrders(user, status, page, limit) {
        return this.orderService.getOrders(user.restaurant_id, {
            status,
            page,
            limit,
        });
    }
    async getOrder(user, orderId) {
        return this.orderService.getOrder(user.restaurant_id, orderId);
    }
    async updateOrderStatus(user, orderId, statusData) {
        return this.orderService.updateOrderStatus(user.restaurant_id, orderId, statusData);
    }
    async getOrderStats(user) {
        return this.orderService.getOrderStats(user.restaurant_id);
    }
};
exports.OrderController = OrderController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: "Create new order (public)" }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "Order created successfully" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "createOrder", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "Get restaurant orders" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Restaurant orders" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)("status")),
    __param(2, (0, common_1.Query)("page")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getOrders", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)(":orderId"),
    (0, swagger_1.ApiOperation)({ summary: "Get order details" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Order details" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("orderId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getOrder", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Patch)(":orderId/status"),
    (0, roles_decorator_1.Roles)("owner", "manager", "staff"),
    (0, swagger_1.ApiOperation)({ summary: "Update order status" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Order status updated" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("orderId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "updateOrderStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, restaurant_role_guard_1.RestaurantRoleGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)("stats/summary"),
    (0, roles_decorator_1.Roles)("owner", "manager"),
    (0, swagger_1.ApiOperation)({ summary: "Get order statistics" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Order statistics" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getOrderStats", null);
exports.OrderController = OrderController = __decorate([
    (0, swagger_1.ApiTags)("order"),
    (0, common_1.Controller)("order"),
    __metadata("design:paramtypes", [typeof (_a = typeof order_service_1.OrderService !== "undefined" && order_service_1.OrderService) === "function" ? _a : Object])
], OrderController);


/***/ }),
/* 36 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrderService = void 0;
const common_1 = __webpack_require__(2);
const database_service_1 = __webpack_require__(16);
let OrderService = class OrderService {
    databaseService;
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async createOrder(orderData) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const orderNumber = `ORDER-${Date.now()}`;
            const { data: order, error } = await supabase
                .from("orders")
                .insert({
                ...orderData,
                order_number: orderNumber,
                status: "pending",
                created_at: new Date().toISOString(),
            })
                .select()
                .single();
            if (error) {
                throw new common_1.BadRequestException("Failed to create order");
            }
            return order;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to create order");
        }
    }
    async getOrders(restaurantId, filters) {
        try {
            const supabase = this.databaseService.getAdminClient();
            let query = supabase
                .from("orders")
                .select(`
          *,
          items:order_items(
            *,
            menu_item:menu_items(name, price)
          )
        `)
                .eq("restaurant_id", restaurantId)
                .order("created_at", { ascending: false });
            if (filters.status) {
                query = query.eq("status", filters.status);
            }
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);
            const { data: orders, error } = await query;
            if (error) {
                throw new common_1.BadRequestException("Failed to get orders");
            }
            return orders;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to get orders");
        }
    }
    async getOrder(restaurantId, orderId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: order, error } = await supabase
                .from("orders")
                .select(`
          *,
          items:order_items(
            *,
            menu_item:menu_items(name, price),
            variations:order_item_variations(*),
            modifiers:order_item_modifiers(*)
          )
        `)
                .eq("id", orderId)
                .eq("restaurant_id", restaurantId)
                .single();
            if (error || !order) {
                throw new common_1.NotFoundException("Order not found");
            }
            return order;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to get order");
        }
    }
    async updateOrderStatus(restaurantId, orderId, statusData) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: order, error } = await supabase
                .from("orders")
                .update({
                status: statusData.status,
                updated_at: new Date().toISOString(),
            })
                .eq("id", orderId)
                .eq("restaurant_id", restaurantId)
                .select()
                .single();
            if (error) {
                throw new common_1.BadRequestException("Failed to update order status");
            }
            await supabase.from("order_status_updates").insert({
                order_id: orderId,
                old_status: order.status,
                new_status: statusData.status,
                reason: statusData.reason,
                updated_by: "system",
                created_at: new Date().toISOString(),
            });
            return order;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to update order status");
        }
    }
    async getOrderStats(restaurantId) {
        try {
            const supabase = this.databaseService.getAdminClient();
            const { data: orders, error } = await supabase
                .from("orders")
                .select("total_amount, status, type, source, created_at")
                .eq("restaurant_id", restaurantId);
            if (error) {
                throw new common_1.BadRequestException("Failed to get order stats");
            }
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
            const statusDistribution = orders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {});
            const typeDistribution = orders.reduce((acc, order) => {
                acc[order.type] = (acc[order.type] || 0) + 1;
                return acc;
            }, {});
            const sourceDistribution = orders.reduce((acc, order) => {
                acc[order.source] = (acc[order.source] || 0) + 1;
                return acc;
            }, {});
            const hourlyOrders = orders.reduce((acc, order) => {
                const hour = new Date(order.created_at).getHours();
                acc[hour] = (acc[hour] || 0) + 1;
                return acc;
            }, {});
            const peakHours = Object.entries(hourlyOrders)
                .map(([hour, count]) => ({
                hour: parseInt(hour),
                order_count: count,
            }))
                .sort((a, b) => b.order_count - a.order_count);
            return {
                total_orders: totalOrders,
                total_revenue: totalRevenue,
                avg_order_value: avgOrderValue,
                order_status_distribution: statusDistribution,
                order_type_distribution: typeDistribution,
                order_source_distribution: sourceDistribution,
                peak_hours: peakHours,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException("Failed to get order stats");
        }
    }
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof database_service_1.DatabaseService !== "undefined" && database_service_1.DatabaseService) === "function" ? _a : Object])
], OrderService);


/***/ }),
/* 37 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DatabaseModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(5);
const database_service_1 = __webpack_require__(16);
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [database_service_1.DatabaseService],
        exports: [database_service_1.DatabaseService],
    })
], DatabaseModule);


/***/ }),
/* 38 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.QueueModule = void 0;
const common_1 = __webpack_require__(2);
const bullmq_1 = __webpack_require__(39);
const config_1 = __webpack_require__(5);
const queue_service_1 = __webpack_require__(40);
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    connection: {
                        host: configService.get("REDIS_HOST", "localhost"),
                        port: configService.get("REDIS_PORT", 6379),
                        password: configService.get("REDIS_PASSWORD"),
                        db: configService.get("REDIS_DB", 0),
                        maxRetriesPerRequest: null,
                    },
                }),
            }),
            bullmq_1.BullModule.registerQueue({ name: "email-queue" }, { name: "webhook-queue" }, { name: "sync-queue" }, { name: "notification-queue" }),
        ],
        providers: [queue_service_1.QueueService],
        exports: [queue_service_1.QueueService],
    })
], QueueModule);


/***/ }),
/* 39 */
/***/ ((module) => {

module.exports = require("@nestjs/bullmq");

/***/ }),
/* 40 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var QueueService_1;
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.QueueService = exports.JOB_TYPES = exports.QUEUE_NAMES = void 0;
const common_1 = __webpack_require__(2);
const bullmq_1 = __webpack_require__(41);
const bullmq_2 = __webpack_require__(39);
exports.QUEUE_NAMES = {
    EMAIL: "email-queue",
    WEBHOOK: "webhook-queue",
    SYNC: "sync-queue",
    NOTIFICATION: "notification-queue",
};
exports.JOB_TYPES = {
    SEND_EMAIL: "send-email",
    SEND_ORDER_CONFIRMATION: "send-order-confirmation",
    SEND_ORDER_STATUS_UPDATE: "send-order-status-update",
    SEND_WELCOME_EMAIL: "send-welcome-email",
    SEND_PASSWORD_RESET: "send-password-reset",
    PROCESS_STRIPE_WEBHOOK: "process-stripe-webhook",
    PROCESS_THIRD_PARTY_WEBHOOK: "process-third-party-webhook",
    SYNC_UBER_EATS_ORDERS: "sync-uber-eats-orders",
    SYNC_DOORDASH_ORDERS: "sync-doordash-orders",
    SYNC_MENU_TO_THIRD_PARTY: "sync-menu-to-third-party",
    SEND_PUSH_NOTIFICATION: "send-push-notification",
    SEND_SMS_NOTIFICATION: "send-sms-notification",
};
let QueueService = QueueService_1 = class QueueService {
    emailQueue;
    webhookQueue;
    syncQueue;
    notificationQueue;
    logger = new common_1.Logger(QueueService_1.name);
    constructor(emailQueue, webhookQueue, syncQueue, notificationQueue) {
        this.emailQueue = emailQueue;
        this.webhookQueue = webhookQueue;
        this.syncQueue = syncQueue;
        this.notificationQueue = notificationQueue;
    }
    async sendEmail(data) {
        await this.emailQueue.add(exports.JOB_TYPES.SEND_EMAIL, data);
        this.logger.log(`Email job queued for ${data.to}`);
    }
    async sendOrderConfirmation(data) {
        await this.emailQueue.add(exports.JOB_TYPES.SEND_ORDER_CONFIRMATION, data);
        this.logger.log(`Order confirmation email queued for order ${data.orderId}`);
    }
    async sendOrderStatusUpdate(data) {
        await this.emailQueue.add(exports.JOB_TYPES.SEND_ORDER_STATUS_UPDATE, data);
        this.logger.log(`Order status update email queued for order ${data.orderId}`);
    }
    async sendWelcomeEmail(data) {
        await this.emailQueue.add(exports.JOB_TYPES.SEND_WELCOME_EMAIL, data);
        this.logger.log(`Welcome email queued for ${data.email}`);
    }
    async sendPasswordReset(data) {
        await this.emailQueue.add(exports.JOB_TYPES.SEND_PASSWORD_RESET, data);
        this.logger.log(`Password reset email queued for ${data.email}`);
    }
    async processStripeWebhook(data) {
        await this.webhookQueue.add(exports.JOB_TYPES.PROCESS_STRIPE_WEBHOOK, data);
        this.logger.log(`Stripe webhook job queued: ${data.event.type}`);
    }
    async processThirdPartyWebhook(data) {
        await this.webhookQueue.add(exports.JOB_TYPES.PROCESS_THIRD_PARTY_WEBHOOK, data);
        this.logger.log(`${data.provider} webhook job queued`);
    }
    async syncUberEatsOrders(data) {
        await this.syncQueue.add(exports.JOB_TYPES.SYNC_UBER_EATS_ORDERS, data);
        this.logger.log(`Uber Eats sync job queued for restaurant ${data.restaurantId}`);
    }
    async syncDoorDashOrders(data) {
        await this.syncQueue.add(exports.JOB_TYPES.SYNC_DOORDASH_ORDERS, data);
        this.logger.log(`DoorDash sync job queued for restaurant ${data.restaurantId}`);
    }
    async syncMenuToThirdParty(data) {
        await this.syncQueue.add(exports.JOB_TYPES.SYNC_MENU_TO_THIRD_PARTY, data);
        this.logger.log(`Menu sync job queued for restaurant ${data.restaurantId} to ${data.provider}`);
    }
    async sendPushNotification(data) {
        await this.notificationQueue.add(exports.JOB_TYPES.SEND_PUSH_NOTIFICATION, data);
        this.logger.log(`Push notification job queued for user ${data.userId}`);
    }
    async sendSMSNotification(data) {
        await this.notificationQueue.add(exports.JOB_TYPES.SEND_SMS_NOTIFICATION, data);
        this.logger.log(`SMS notification job queued for ${data.to}`);
    }
    async getQueueStats() {
        const stats = await Promise.all([
            this.getQueueStat("email", this.emailQueue),
            this.getQueueStat("webhook", this.webhookQueue),
            this.getQueueStat("sync", this.syncQueue),
            this.getQueueStat("notification", this.notificationQueue),
        ]);
        return stats.reduce((acc, stat) => {
            acc[stat.name] = stat.stats;
            return acc;
        }, {});
    }
    async getQueueStat(name, queue) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        return {
            name,
            stats: {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
            },
        };
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = QueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_2.InjectQueue)("email-queue")),
    __param(1, (0, bullmq_2.InjectQueue)("webhook-queue")),
    __param(2, (0, bullmq_2.InjectQueue)("sync-queue")),
    __param(3, (0, bullmq_2.InjectQueue)("notification-queue")),
    __metadata("design:paramtypes", [typeof (_a = typeof bullmq_1.Queue !== "undefined" && bullmq_1.Queue) === "function" ? _a : Object, typeof (_b = typeof bullmq_1.Queue !== "undefined" && bullmq_1.Queue) === "function" ? _b : Object, typeof (_c = typeof bullmq_1.Queue !== "undefined" && bullmq_1.Queue) === "function" ? _c : Object, typeof (_d = typeof bullmq_1.Queue !== "undefined" && bullmq_1.Queue) === "function" ? _d : Object])
], QueueService);


/***/ }),
/* 41 */
/***/ ((module) => {

module.exports = require("bullmq");

/***/ }),
/* 42 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.configuration = void 0;
const configuration = () => ({
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv: process.env.NODE_ENV || "development",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    jwt: {
        secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    },
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB, 10) || 0,
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    uploads: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    },
    ubereats: {
        apiKey: process.env.UBEREATS_API_KEY,
        baseUrl: process.env.UBEREATS_BASE_URL || "https://api.uber.com",
    },
    doordash: {
        apiKey: process.env.DOORDASH_API_KEY,
        baseUrl: process.env.DOORDASH_BASE_URL || "https://openapi.doordash.com",
    },
    email: {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
        smtpUser: process.env.SMTP_USER,
        smtpPassword: process.env.SMTP_PASSWORD,
        from: process.env.EMAIL_FROM || "noreply@vision-menu.com",
    },
});
exports.configuration = configuration;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(3);
const app_module_1 = __webpack_require__(4);
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    app.enableCors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    });
    app.setGlobalPrefix("api/v1");
    const config = new swagger_1.DocumentBuilder()
        .setTitle("Vision Menu API")
        .setDescription("Restaurant ordering and management platform API")
        .setVersion("1.0")
        .addBearerAuth()
        .addTag("auth", "Authentication endpoints")
        .addTag("restaurant", "Restaurant management")
        .addTag("menu", "Menu management")
        .addTag("order", "Order management")
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("api/docs", app, document);
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Vision Menu API running on: http://localhost:${port}`);
    console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();

})();

/******/ })()
;