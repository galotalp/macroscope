"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAnon = exports.supabase = exports.isDemoMode = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isValidUrl = supabaseUrl &&
    supabaseUrl.trim() !== '' &&
    supabaseUrl !== 'your-supabase-url-here' &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co');
const isValidAnonKey = supabaseAnonKey &&
    supabaseAnonKey.trim() !== '' &&
    supabaseAnonKey !== 'your-supabase-anon-key-here' &&
    supabaseAnonKey.length > 20;
const isValidServiceKey = supabaseServiceKey &&
    supabaseServiceKey.trim() !== '' &&
    supabaseServiceKey !== 'your-supabase-service-role-key-here' &&
    supabaseServiceKey.length > 20;
exports.isDemoMode = !isValidUrl || !isValidAnonKey || !isValidServiceKey;
exports.supabase = exports.isDemoMode ? null : (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
exports.supabaseAnon = exports.isDemoMode ? null : (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
if (exports.isDemoMode) {
    console.log('🔧 Running in demo mode - no valid Supabase credentials found');
    if (supabaseUrl && supabaseUrl !== 'your-supabase-url-here') {
        console.log('   Supabase URL format appears invalid:', supabaseUrl);
    }
    if (!isValidAnonKey && supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key-here') {
        console.log('   Supabase anon key format appears invalid');
    }
    if (!isValidServiceKey) {
        console.log('   Supabase service role key missing or invalid');
    }
}
else {
    console.log('🗄️  Connected to Supabase database with service role');
}
//# sourceMappingURL=database.js.map