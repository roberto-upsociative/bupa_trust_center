(() => {
  const config = window.APP_CONFIG || {};
  const storageKey = "trust-center-rut";
  const authStorageKey = "trust-center-auth";

  function loadTrustCenterSdk(blobUrl) {
    return new Promise((resolve, reject) => {
      const src = `${blobUrl.replace(/\/$/, "")}/portal-trust-center/trust-center/scripts/portal-sdk.js`;
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (window.customElements?.get("trust-center")) resolve();
        else {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
        }
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.type = "text/javascript";
      script.onload = resolve;
      script.onerror = () => reject(new Error("No fue posible cargar el SDK de Trust Center."));
      document.body.append(script);
    });
  }

  const form = document.querySelector("#rut-form");
  if (form) {
    const rutInput = document.querySelector("#rut");
    const status = document.querySelector("#status");
    rutInput.value = localStorage.getItem(storageKey) || "";

    function showStatus(message, kind = "info") {
      status.textContent = message;
      status.dataset.kind = kind;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const rut = rutInput.value.trim();
      if (!rut) {
        showStatus("Ingresa tu RUT para continuar.", "error");
        return;
      }

      localStorage.setItem(storageKey, rut);
      const required = ["tenantId", "portalId", "blobUrl", "tokenEndpoint"];
      const missing = required.filter((key) => !String(config[key] || "").trim());
      if (missing.length) {
        showStatus(`Configura estos valores en config.js: ${missing.join(", ")}.`, "error");
        return;
      }

      showStatus("Conectando con Trust Center…");
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        const response = await fetch(config.tokenEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rut })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || `El servicio de autenticación respondió con HTTP ${response.status}.`);
        }
        if (!result.token) throw new Error("El servicio de autenticación no devolvió el JWT esperado.");

        sessionStorage.setItem(authStorageKey, JSON.stringify({ id: rut, token: result.token }));
        window.location.assign("trust.html");
      } catch (error) {
        showStatus(error.message || "No fue posible acceder a Trust Center.", "error");
      } finally {
        button.disabled = false;
      }
    });
    return;
  }

  const trustStatus = document.querySelector("#trust-status");
  const trustHost = document.querySelector("#trust-center-host");
  if (!trustStatus || !trustHost) return;

  const savedAuth = sessionStorage.getItem(authStorageKey);
  if (!savedAuth) {
    window.location.replace("index.html");
    return;
  }

  const backLink = document.querySelector("#change-rut");
  backLink?.addEventListener("click", () => sessionStorage.removeItem(authStorageKey));

  async function renderTrustCenter() {
    const auth = JSON.parse(savedAuth);
    if (!auth.id || !auth.token) throw new Error("La sesión no es válida. Ingresa tu RUT nuevamente.");

    window.OneTrust = {
      dataSubjectParams: { id: auth.id, isAnonymous: false, token: auth.token }
    };
    const trustCenter = document.createElement("trust-center");
    trustCenter.setAttribute("tenantId", config.tenantId);
    trustCenter.setAttribute("portalId", config.portalId);
    trustCenter.setAttribute("blobUrl", config.blobUrl);
    trustCenter.setAttribute("workerUrl", config.workerUrl || "https://portal-api.onetrust.com");
    trustCenter.setAttribute("desktopMenuContainerId", "trust-center-menu");
    trustCenter.setAttribute("mobileMenuContainerId", "trust-center-menu");
    trustHost.append(trustCenter);
    await loadTrustCenterSdk(config.blobUrl);
    trustStatus.textContent = "Trust Center listo.";
    trustStatus.dataset.kind = "success";
  }

  renderTrustCenter().catch((error) => {
    trustStatus.textContent = error.message || "No fue posible cargar Trust Center.";
    trustStatus.dataset.kind = "error";
  });
})();
