"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminEmail, restaurant, cat, adminMembership, admin, hash, p1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adminEmail = 'demo-cro@zapieat.com';
                    console.log('Buscando usuario de admin...');
                    return [4 /*yield*/, prisma.restaurant.findFirst({
                            where: { slug: 'bar-pepe' },
                            include: { products: true, memberships: { include: { user: true } } }
                        })];
                case 1:
                    restaurant = _a.sent();
                    if (!(!restaurant || restaurant.products.length === 0)) return [3 /*break*/, 6];
                    console.log('Usando Demo CRO o crear un producto...');
                    return [4 /*yield*/, prisma.restaurant.findFirst({
                            where: { slug: 'demo-cro' },
                            include: { products: true, memberships: { include: { user: true } } }
                        })];
                case 2:
                    restaurant = _a.sent();
                    if (!(restaurant && restaurant.products.length === 0)) return [3 /*break*/, 6];
                    console.log('Creando producto de prueba');
                    return [4 /*yield*/, prisma.category.create({ data: { restaurantId: restaurant.id, name: 'Principal' } })];
                case 3:
                    cat = _a.sent();
                    return [4 /*yield*/, prisma.product.create({
                            data: {
                                restaurantId: restaurant.id,
                                categoryId: cat.id,
                                name: 'Pizza Margarita',
                                price: 10.00
                            }
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, prisma.restaurant.findFirst({
                            where: { slug: 'demo-cro' },
                            include: { products: true, memberships: { include: { user: true } } }
                        })];
                case 5:
                    restaurant = _a.sent();
                    _a.label = 6;
                case 6:
                    if (!restaurant) {
                        console.log('Restaurante no encontrado');
                        return [2 /*return*/];
                    }
                    adminMembership = restaurant.memberships.find(function (m) { return m.role === 'RESTAURANT_ADMIN'; });
                    if (!adminMembership) {
                        console.log('Admin no encontrado');
                        return [2 /*return*/];
                    }
                    admin = adminMembership.user;
                    return [4 /*yield*/, bcryptjs_1.default.hash('123456', 10)];
                case 7:
                    hash = _a.sent();
                    return [4 /*yield*/, prisma.user.update({ where: { id: admin.id }, data: { passwordHash: hash } })];
                case 8:
                    _a.sent();
                    console.log('Login credentials -> Email: ' + admin.email + ' / Pass: 123456');
                    p1 = restaurant.products[0];
                    if (!p1) {
                        console.log('Sin productos para hacer pedidos');
                        return [2 /*return*/];
                    }
                    // Borrar pedidos viejos
                    return [4 /*yield*/, prisma.order.deleteMany({ where: { restaurantId: restaurant.id } })];
                case 9:
                    // Borrar pedidos viejos
                    _a.sent();
                    console.log('Creando pedidos...');
                    // Pedido 1
                    return [4 /*yield*/, prisma.order.create({
                            data: {
                                restaurantId: restaurant.id,
                                orderNumber: 101,
                                status: 'PAID',
                                type: 'TABLE',
                                customerName: 'Mesa 4',
                                subtotal: p1.price,
                                total: p1.price,
                                items: { create: [{ productId: p1.id, quantity: 2, productNameSnapshot: p1.name, unitPrice: p1.price, notes: 'Sin cebolla' }] }
                            }
                        })];
                case 10:
                    // Pedido 1
                    _a.sent();
                    // Pedido 2
                    return [4 /*yield*/, prisma.order.create({
                            data: {
                                restaurantId: restaurant.id,
                                orderNumber: 102,
                                status: 'PREPARING',
                                type: 'DELIVERY',
                                customerName: 'Juan P.',
                                subtotal: Number(p1.price) * 2,
                                total: Number(p1.price) * 2,
                                items: { create: [{ productId: p1.id, quantity: 1, productNameSnapshot: p1.name, unitPrice: p1.price }] }
                            }
                        })];
                case 11:
                    // Pedido 2
                    _a.sent();
                    // Pedido 3
                    return [4 /*yield*/, prisma.order.create({
                            data: {
                                restaurantId: restaurant.id,
                                orderNumber: 103,
                                status: 'READY',
                                type: 'PICKUP',
                                customerName: 'Ana G.',
                                subtotal: p1.price,
                                total: p1.price,
                                items: { create: [{ productId: p1.id, quantity: 1, productNameSnapshot: p1.name, unitPrice: p1.price }] }
                            }
                        })];
                case 12:
                    // Pedido 3
                    _a.sent();
                    console.log('Orders created successfully! Restaurant Slug: ' + restaurant.slug);
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(console.error)
    .finally(function () { return prisma.$disconnect(); });
