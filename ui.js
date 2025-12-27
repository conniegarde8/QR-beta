// ui.js
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js';
import { sharedState } from './state.js';
import { applyWhitelistDOMChanges } from './whitelist.js';

// 滚动条自动隐藏/显示逻辑辅助函数 (导出供 Settings 使用)
export const attachScrollListener = (element) => {
    let scrollTimeout;
    element.addEventListener('scroll', () => {
        // 添加类名以显示滚动条
        if (!element.classList.contains('is-scrolling')) {
            element.classList.add('is-scrolling');
        }

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            element.classList.remove('is-scrolling');
        }, 500); // 停止滚动 0.5s 后隐藏
    }, { passive: true });

    // 鼠标悬停时也显示滚动条，防止用户想拖动时消失
    element.addEventListener('mouseenter', () => element.classList.add('is-scrolling'));
    element.addEventListener('mouseleave', () => element.classList.remove('is-scrolling'));
};

export function createMenuElement() {
    const menu = document.createElement('div');
    menu.id = Constants.ID_MENU;
    menu.setAttribute('role', 'dialog');
    menu.tabIndex = -1;

    const leftColumn = document.createElement('div');
    leftColumn.className = 'column column-left';
    // 删除标题 h2
    const leftList = document.createElement('div');
    leftList.className = 'action-list';
    leftList.id = 'qr-list-left';
    attachScrollListener(leftList); // 绑定滚动监听
    leftColumn.appendChild(leftList);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'column column-right';
    // 删除标题 h2
    const rightList = document.createElement('div');
    rightList.className = 'action-list';
    rightList.id = 'qr-list-right';
    attachScrollListener(rightList); // 绑定滚动监听
    rightColumn.appendChild(rightList);

    menu.appendChild(leftColumn);
    menu.appendChild(rightColumn);

    return menu;
}

export function createQuickReplyItem(reply) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = Constants.CLASS_ACTION_ITEM;

    item.dataset.label = reply.label?.trim() || '';
    item.dataset.isStandard = String(reply.isStandard !== false);
    item.dataset.setName = reply.setName || 'Unknown';
    item.dataset.source = reply.source || 'Unknown';

    if (reply.source === 'JSSlashRunner') {
        item.dataset.isApiBased = String(!!reply.isApiBased);
        if (reply.isApiBased) item.dataset.buttonId = reply.buttonId;
        item.dataset.scriptId = reply.scriptId;
    } else if (reply.source === 'LittleWhiteBox') {
        item.dataset.taskId = reply.taskId;
        item.dataset.taskScope = reply.taskScope;
    }

    // 第四点需求：内部包裹 span 以配合 CSS 实现 margin: auto 居中效果
    const span = document.createElement('span');
    span.textContent = item.dataset.label;
    item.appendChild(span);

    // 第三点需求：移除原生 title，使用自定义悬停逻辑
    item.removeAttribute('title');

    // 绑定悬停事件显示自定义 Tooltip
    item.addEventListener('mouseenter', (e) => {
        showTooltip(e, reply);
    });
    item.addEventListener('mouseleave', () => {
        hideTooltip();
    });
    item.addEventListener('mousemove', (e) => {
        moveTooltip(e);
    });

    // --- 移动端长摁逻辑 ---
    let pressTimer;
    const clearTimer = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    item.addEventListener('touchstart', (e) => {
        clearTimer();
        // 设置 600ms 长摁阈值
        pressTimer = setTimeout(() => {
            // 第二点需求：长摁显示详细信息
            // 1. 来源解析
            let sourceText = '未知来源';
            if (reply.source === 'JSSlashRunner') sourceText = '酒馆助手 (JSR)';
            else if (reply.source === 'QuickReplyV2') sourceText = '快速回复 (QR)';
            else if (reply.source === 'LittleWhiteBox') sourceText = '小白X (LWB)';

            // 2. 作用域解析
            let scopeText = '通用';
            if (reply.scope === 'global') scopeText = '全局';
            else if (reply.scope === 'character') scopeText = '角色';

            // 兼容旧逻辑防御
            if (!reply.scope && reply.taskScope) {
                 scopeText = reply.taskScope === 'global' ? '全局' : '角色';
            }

            // 3. 脚本/集来源
            const setSource = reply.setName || 'Default';
            const btnName = reply.label;

            // 构建 HTML
            const htmlContent = `
                <div style="text-align:left; font-size:0.9em; line-height:1.5;">
                    <div>来源: ${sourceText}</div>
                    <div>作用域: ${scopeText}</div>
                    <div>归属: ${setSource}</div>
                    <div style="margin-top:4px; font-weight:bold; color:red; font-size:1.1em;">${btnName}</div>
                </div>
            `;

            if (window.toastr) {
                window.toastr.info(htmlContent, '', {
                    timeOut: 4000,
                    positionClass: 'toast-top-center',
                    preventDuplicates: true,
                    escapeHtml: false // 允许 HTML
                });
            } else {
                alert(`来源: ${sourceText}\n作用域: ${scopeText}\n归属: ${setSource}\n名称: ${btnName}`);
            }
        }, 600);
    }, { passive: true });

    item.addEventListener('touchend', clearTimer, { passive: true });
    item.addEventListener('touchmove', clearTimer, { passive: true });
    // ---------------------

    return item;
}

function createEmptyState(text) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.textContent = text;
    return div;
}

export function renderQuickReplies(scriptReplies, standardReplies) {
    const leftList = document.getElementById('qr-list-left');
    const rightList = document.getElementById('qr-list-right');

    if (!leftList || !rightList) return;

    // 移除 scopeName 参数，现在 scope 信息包含在 reply 对象内部
    const populateContainer = (container, replies, emptyText) => {
        container.innerHTML = '';
        const parentColumn = container.parentElement;
        const oldEmpty = parentColumn.querySelector('.empty-state');
        if (oldEmpty) oldEmpty.remove();

        if (replies && replies.length > 0) {
            container.style.display = 'flex';

            replies.forEach((reply, index) => {
                const btn = createQuickReplyItem(reply);

                // 相同来源(setName)合并背景
                const prev = replies[index - 1];
                const next = replies[index + 1];
                const currSet = reply.setName;

                const isPrevSame = prev && prev.setName === currSet;
                const isNextSame = next && next.setName === currSet;

                if (!isPrevSame && isNextSame) {
                    btn.classList.add('group-start');
                } else if (isPrevSame && isNextSame) {
                    btn.classList.add('group-middle');
                } else if (isPrevSame && !isNextSame) {
                    btn.classList.add('group-end');
                }

                btn.addEventListener('click', (e) => {
                     if (window.quickReplyMenu?.handleQuickReplyClick) {
                        window.quickReplyMenu.handleQuickReplyClick(e);
                     }
                });
                container.appendChild(btn);
            });
        } else {
            container.style.display = 'none';
            parentColumn.appendChild(createEmptyState(emptyText));
        }
    };

    // 左栏：显示脚本 (JSR, LWB)
    populateContainer(leftList, scriptReplies, '没有可用的脚本按钮');
    // 右栏：显示标准快速回复 (QR v2)
    populateContainer(rightList, standardReplies, '没有可用的快速回复');
}

export function updateMenuVisibilityUI() {
    const { menu, rocketButton } = sharedState.domElements;
    const show = sharedState.menuVisible;

    if (!menu || !rocketButton) return;

    if (show) {
        // 使用 visualViewport (如果可用) 以获得更准确的移动端可视区域
        const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const vTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
        const vLeft = window.visualViewport ? window.visualViewport.offsetLeft : 0;

        // 宽度设置：移动端占 95%，桌面端限制最大宽度
        const isMobile = vw < 600;
        const targetWidth = isMobile ? vw * 0.95 : Math.min(vw * 0.85, 800);

        menu.style.width = `${targetWidth}px`;
        menu.style.height = 'auto';
        // 限制最大高度，防止溢出屏幕，预留上下各 20px 空间
        menu.style.maxHeight = `${vh - 40}px`;

        // 暂时显示以进行测量
        menu.style.visibility = 'hidden';
        menu.classList.add('visible');

        // 第一点需求：使用 requestAnimationFrame 等待 DOM 渲染完成后再计算坐标
        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();

            // 重新获取最新的视口数据 (以防万一)
            const curVw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
            const curVh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            const curVTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
            const curVLeft = window.visualViewport ? window.visualViewport.offsetLeft : 0;

            const topPos = curVTop + (curVh - rect.height) / 2;
            const leftPos = curVLeft + (curVw - rect.width) / 2;

            menu.style.position = 'fixed';
            menu.style.top = `${Math.max(curVTop + 10, topPos)}px`;
            menu.style.left = `${leftPos}px`;
            menu.style.transform = 'none';
            menu.style.margin = '0';

            // 计算完毕，显示
            menu.style.visibility = 'visible';
            rocketButton.classList.add('active');
        });

        try {
            // 更新为获取 scripts 和 standard
            const { scripts, standard } = fetchQuickReplies();
            renderQuickReplies(scripts, standard);
            applyWhitelistDOMChanges();
        } catch (e) {
            console.error("Error fetching replies:", e);
        }
    } else {
        menu.classList.remove('visible');
        rocketButton.classList.remove('active');
        applyWhitelistDOMChanges();
    }
}

// --- 自定义 Tooltip 逻辑 ---
let tooltipEl = null;

function getTooltipElement() {
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'qr-tooltip';
        document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
}

function showTooltip(e, reply) {
    const el = getTooltipElement();

    // 解析来源信息 (复用长摁逻辑)
    let sourceText = '未知来源';
    if (reply.source === 'JSSlashRunner') sourceText = '酒馆助手 (JSR)';
    else if (reply.source === 'QuickReplyV2') sourceText = '快速回复 (QR)';
    else if (reply.source === 'LittleWhiteBox') sourceText = '小白X (LWB)';

    let scopeText = '通用';
    if (reply.scope === 'global') scopeText = '全局';
    else if (reply.scope === 'character') scopeText = '角色';

    const setSource = reply.setName || 'Default';
    // 如果是 LWB，setName 包含了ID，为了展示美观，可以截取
    const displaySource = reply.source === 'LittleWhiteBox' ? 'XB-Task' : setSource;

    el.innerHTML = `
        <div style="text-align:left; line-height:1.5;">
            <div style="color:#666; font-size:0.9em;">来源: ${sourceText}</div>
            <div style="color:#666; font-size:0.9em;">作用域: ${scopeText}</div>
            <div style="color:#666; font-size:0.9em;">归属: ${displaySource}</div>
            <div style="margin-top:6px; font-weight:600; color:#333; font-size:1.1em; border-top:1px solid #eee; padding-top:4px;">
                ${reply.label}
            </div>
        </div>
    `;

    el.classList.add('visible');
    moveTooltip(e);
}

function moveTooltip(e) {
    const el = getTooltipElement();
    if (!el.classList.contains('visible')) return;

    // 鼠标跟随 + 偏移
    const offset = 15;
    let left = e.clientX + offset;
    let top = e.clientY + offset;

    // 边界检测
    const rect = el.getBoundingClientRect();
    if (left + rect.width > window.innerWidth) {
        left = e.clientX - rect.width - offset;
    }
    if (top + rect.height > window.innerHeight) {
        top = e.clientY - rect.height - offset;
    }

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
}

function hideTooltip() {
    const el = getTooltipElement();
    el.classList.remove('visible');
}