"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.isDemoMode = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const isValidUrl = supabaseUrl &&
    supabaseUrl.trim() !== '' &&
    supabaseUrl !== 'your-supabase-url-here' &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co');
const isValidKey = supabaseKey &&
    supabaseKey.trim() !== '' &&
    supabaseKey !== 'your-supabase-anon-key-here' &&
    supabaseKey.length > 20;
exports.isDemoMode = !isValidUrl || !isValidKey;
exports.supabase = exports.isDemoMode ? null : (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
if (exports.isDemoMode) {
    console.log('🔧 Running in demo mode - no valid Supabase credentials found');
    if (supabaseUrl && supabaseUrl !== 'your-supabase-url-here') {
        console.log('   Supabase URL format appears invalid:', supabaseUrl);
    }
    if (supabaseKey && supabaseKey !== 'your-supabase-anon-key-here') {
        console.log('   Supabase key format appears invalid');
    }
}
else {
    console.log('🗄️  Connected to Supabase database');
}
//# sourceMappingURL=database.js.map