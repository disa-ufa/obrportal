import { formatApiError } from "../utils/apiErrors";
import { useNavigate } from "react-router-dom";

import {
  checkAdminRbac,
  clearToken,
  getCurrentUser,
  getStoredToken,
  login,
  registerUser,
  storeToken,
} from "../api/client";
import { EMPTY_ADMIN_DATA, userHasRole } from "../utils/adminState";

function getPostAuthPublicPage(user) {
  if (userHasRole(user, "org_rep")) {
    return "organization";
  }

  return userHasRole(user, "ministry_admin") ? "ministry" : "account";
}

function getPostAuthPublicPath(user) {
  if (userHasRole(user, "org_rep")) {
    return "/organization";
  }

  return userHasRole(user, "ministry_admin") ? "/ministry" : "/account";
}

export function useAuthFlow({
  email,
  password,
  setUser,
  setRbac,
  setAdminData,
  setAdminDataLoadedAt,
  setCurrentPage,
  setError,
  setAuthLoading,
  setAdminLoading,
  setInitializingAuth,
  clearAllSelections,
  loadAdminData,
  completePendingEnrollmentIfNeeded,
}) {
  const navigate = useNavigate();

  async function bootstrapAuthState() {
    setInitializingAuth(true);

    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setAdminData(EMPTY_ADMIN_DATA);
      setAdminDataLoadedAt("");
      setInitializingAuth(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (userHasRole(currentUser, "admin")) {
        setCurrentPage("dashboard");
        await loadAdminData();
      } else {
        setCurrentPage(getPostAuthPublicPage(currentUser));
      }
    } catch {
      clearToken();
      setUser(null);
      setRbac(null);
      setAdminData(EMPTY_ADMIN_DATA);
      setAdminDataLoadedAt("");
      clearAllSelections();
    } finally {
      setInitializingAuth(false);
    }
  }

  async function handleRegister(payload) {
    setAuthLoading(true);
    setError("");

    try {
      return await registerUser(payload);
    } catch (err) {
      setError(formatApiError(err, "Не удалось отправить заявку на регистрацию."));
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthLoading(true);
    setError("");
    setRbac(null);
    clearAllSelections();

    try {
      await login(email, password);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (userHasRole(currentUser, "admin")) {
        setCurrentPage("dashboard");
        await loadAdminData();
        navigate("/admin", { replace: true });
      } else {
        setAdminData(EMPTY_ADMIN_DATA);
        setAdminDataLoadedAt("");
        await completePendingEnrollmentIfNeeded();
        navigate(getPostAuthPublicPath(currentUser), { replace: true });
      }
    } catch (err) {
      setError(formatApiError(err, "Не удалось войти."));
      setUser(null);
      setAdminData(EMPTY_ADMIN_DATA);
      setAdminDataLoadedAt("");
    } finally {
      setAuthLoading(false);
      setInitializingAuth(false);
    }
  }

  async function handleRbacCheck() {
    setAuthLoading(true);
    setError("");

    try {
      const data = await checkAdminRbac();
      setRbac(data);
    } catch (err) {
      setError(formatApiError(err, "Не удалось проверить права доступа."));
      setRbac(null);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setRbac(null);
    setAdminData(EMPTY_ADMIN_DATA);
    setAdminDataLoadedAt("");
    setCurrentPage("dashboard");
    setError("");
    setAuthLoading(false);
    setAdminLoading(false);
    setInitializingAuth(false);
    clearAllSelections();
  }

  return {
    bootstrapAuthState,
    handleRegister,
    handleLogin,
    handleRbacCheck,
    handleLogout,
  };
}
