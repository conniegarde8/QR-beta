// constants.js

export const EXTENSION_NAME = "quick-reply-menu";

// --- 开发者可配置的内置白名单 ---
// 在这里添加的 ID 将始终被视为在白名单中，不会被插件隐藏
// 格式参考：'JSR::script_id', 'QRV2::Set Name', 'input_helper_toolbar'
export const BUILTIN_WHITELIST = [
    // 示例：内置保护输入助手的工具栏不被隐藏
    'input_helper_toolbar',
    'custom_buttons_container' 
];

// --- CSS Classes ---
export const CLASS_ENABLED = 'qr-menu-enabled';
export const CLASS_DISABLED = 'qr-menu-disabled';

// --- DOM Element IDs ---
export const ID_ROCKET_BUTTON = 'quick-reply-rocket-button'; 
export const ID_MENU = 'quick-reply-menu';

// 设置面板相关 ID
export const ID_SETTINGS_CONTAINER = `${EXTENSION_NAME}-settings`;
export const ID_SETTINGS_ENABLED_DROPDOWN = `${EXTENSION_NAME}-enabled`;
export const ID_ICON_TYPE_DROPDOWN = `${EXTENSION_NAME}-icon-type`;
export const ID_CUSTOM_ICON_URL = `${EXTENSION_NAME}-custom-icon-url`;
export const ID_CUSTOM_ICON_SIZE_INPUT = `${EXTENSION_NAME}-custom-icon-size`;
export const ID_FA_ICON_CODE_INPUT = `${EXTENSION_NAME}-fa-icon-code`;
export const ID_GLOBAL_ICON_SIZE_INPUT = `${EXTENSION_NAME}-global-icon-size`;
export const ID_RESET_ICON_SIZE_BUTTON = `${EXTENSION_NAME}-reset-icon-size`;

// 自定义图标保存相关
export const ID_CUSTOM_ICON_SAVE = `${EXTENSION_NAME}-custom-icon-save`;
export const ID_CUSTOM_ICON_SELECT = `${EXTENSION_NAME}-custom-icon-select`;
export const ID_DELETE_SAVED_ICON_BUTTON = `${EXTENSION_NAME}-delete-saved-icon`;

// 白名单管理相关 ID
export const ID_WHITELIST_BUTTON = `${EXTENSION_NAME}-whitelist-button`;
export const ID_WHITELIST_PANEL = `${EXTENSION_NAME}-whitelist-panel`;

// 自动伸缩
export const ID_AUTO_SHRINK_CHECKBOX = `${EXTENSION_NAME}-auto-shrink-enabled`;
export const ID_AUTO_SHRINK_STYLE_TAG = 'qrq-auto-shrink-style-tag';

// --- UI 类名 (基于新设计的 CSS) ---
export const CLASS_ACTION_ITEM = 'action-item';
export const CLASS_ACTION_ITEM_ACTIVE = 'active';

// --- 默认图标选项 ---
export const ICON_TYPES = {
    ROCKET: 'rocket',
    COMMENT: 'comment',
    STAR: 'star',
    BOLT: 'bolt',
    FONTAWESOME: 'fontawesome',
    CUSTOM: 'custom'
};

export const ICON_CLASS_MAP = {
    [ICON_TYPES.ROCKET]: 'fa-rocket',
    [ICON_TYPES.COMMENT]: 'fa-palette',
    [ICON_TYPES.STAR]: 'fa-star-and-crescent',
    [ICON_TYPES.BOLT]: 'fa-star-of-david',
    [ICON_TYPES.CUSTOM]: '', 
    [ICON_TYPES.FONTAWESOME]: ''
};

export const DEFAULT_CUSTOM_ICON_SIZE = 20;

// --- 设置页面 Tab 相关 ID ---
export const ID_SETTINGS_TAB_BAR = `${EXTENSION_NAME}-settings-tab-bar`;
export const ID_TAB_MAIN = `${EXTENSION_NAME}-tab-main`;
export const ID_TAB_ICON = `${EXTENSION_NAME}-tab-icon`;
export const ID_TAB_HELP = `${EXTENSION_NAME}-tab-help`;

export const ID_PAGE_MAIN = `${EXTENSION_NAME}-page-main`;
export const ID_PAGE_ICON = `${EXTENSION_NAME}-page-icon`;
export const ID_PAGE_HELP = `${EXTENSION_NAME}-page-help`;