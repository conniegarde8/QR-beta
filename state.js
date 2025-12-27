export const sharedState = {
    menuVisible: false,
    domElements: {
        rocketButton: null,
        menu: null
    }
};

export function setMenuVisible(visible) {
    sharedState.menuVisible = visible;
}