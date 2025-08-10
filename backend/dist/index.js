"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDemoMode = exports.supabase = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
Object.defineProperty(exports, "supabase", { enumerable: true, get: function () { return database_1.supabase; } });
Object.defineProperty(exports, "isDemoMode", { enumerable: true, get: function () { return database_1.isDemoMode; } });
dotenv_1.default.config();
if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set!');
    console.error('Please set JWT_SECRET in your .env file');
    process.exit(1);
}
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express_1.default.static('uploads'));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const groups_1 = __importDefault(require("./routes/groups"));
const projects_1 = __importDefault(require("./routes/projects"));
console.log('Routes imported successfully');
const auth_demo_1 = __importDefault(require("./routes/demo/auth-demo"));
const users_demo_1 = __importDefault(require("./routes/demo/users-demo"));
const groups_demo_1 = __importDefault(require("./routes/demo/groups-demo"));
const projects_demo_1 = __importDefault(require("./routes/demo/projects-demo"));
if (database_1.isDemoMode) {
    console.log('🔧 Using demo routes (no database persistence)');
    app.use('/api/auth', auth_demo_1.default);
    app.use('/api/users', users_demo_1.default);
    app.use('/api/groups', groups_demo_1.default);
    app.use('/api/projects', projects_demo_1.default);
}
else {
    console.log('🗄️  Using Supabase routes (full database functionality)');
    console.log('Registering auth routes...');
    app.use('/api/auth', auth_1.default);
    console.log('Registering users routes...');
    app.use('/api/users', users_1.default);
    console.log('Users routes mounted at /api/users');
    console.log('Registering groups routes...');
    app.use('/api/groups', groups_1.default);
    console.log('Registering projects routes...');
    app.use('/api/projects', projects_1.default);
}
app.get('/', (req, res) => {
    res.json({
        message: 'Research Coordinator API is running!',
        demoMode: database_1.isDemoMode,
        databaseStatus: database_1.isDemoMode ? 'Demo mode - in-memory data' : 'Connected to Supabase'
    });
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=index.js.map