(() => {
  const config = window.APP_CONFIG || {};
  const form = document.querySelector("#rut-form");
  const rutInput = document.querySelector("#rut");
  const status = document.querySelector("#status");
  const section = document.querySelector("#trust-section");
  const host = document.querySelector("#trust-center-host");
  const card = section.closest(".card");
  const storageKey = "trust-center-rut";

  rutInput.value = localStorage.getItem(storageKey) || "";

  function showStatus(message, kind = "info") {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function missingConfiguration() {
    const required = ["tenantId", "portalId", "blobUrl", "tokenEndpoint"];
    return required.filter((key) => !String(config[key] || "").trim());
  }

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
      script.onerror = () => reject(new Error("Não foi possível carregar o SDK do Trust Center."));
      document.body.append(script);
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const rut = rutInput.value.trim();
    if (!rut) {
      showStatus("Informe seu RUT para continuar.", "error");
      return;
    }

    localStorage.setItem(storageKey, rut);
    section.hidden = true;
    card.classList.remove("card--trust-open");
    host.replaceChildren();

    const missing = missingConfiguration();
    if (missing.length) {
      showStatus(`RUT armazenado. Configure no config.js: ${missing.join(", ")}.`, "error");
      return;
    }

    showStatus("Conectando ao Trust Center…");
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
        throw new Error(result.error || `O serviço de autenticação respondeu com HTTP ${response.status}.`);
      }
      if (!result.token) throw new Error("O serviço de autenticação não retornou o JWT esperado.");

      window.OneTrust = {
        dataSubjectParams: { id: rut, isAnonymous: false, token: result.token }
      };
      await loadTrustCenterSdk(config.blobUrl);

      const trustCenter = document.createElement("trust-center");
      trustCenter.setAttribute("tenantId", config.tenantId);
      trustCenter.setAttribute("portalId", config.portalId);
      trustCenter.setAttribute("blobUrl", config.blobUrl);
      trustCenter.setAttribute("workerUrl", config.workerUrl || "https://portal-api.onetrust.com");
      // Make the host visible at its final width before the SDK initializes
      // the custom element and measures its responsive layout.
      section.hidden = false;
      card.classList.add("card--trust-open");
      host.append(trustCenter);
      showStatus("Trust Center carregado.", "success");
    } catch (error) {
      showStatus(error.message || "Não foi possível acessar o Trust Center.", "error");
    } finally {
      button.disabled = false;
    }
  });
})();
