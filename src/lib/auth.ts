export const getToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

export const setTokens = (access: string, refresh: string) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
};

export const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};

export const isAuthenticated = () => !!getToken();

export const logout = () => {
    clearTokens();
    // Only hard-redirect when we're not already on the login page. Otherwise a
    // 401 raised by a query that runs on /login (e.g. the globally-mounted
    // CommandPalette's ['userMe'] fetch) would reload → refetch → 401 → reload,
    // an infinite loop. On /login we just drop the bad token and stay put.
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
};
