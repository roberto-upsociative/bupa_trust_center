/* Preencha com os identificadores e URLs fornecidos para o tenant de homologação. */
window.APP_CONFIG = {
  tenantId: "aea7fda5-e906-40d5-a69a-7994c5392482",
  portalId: "2c6f2396-410d-4c3a-8a77-bc97805d4b1d",
  blobUrl: "https://uat-bupa-cl-privacy.my.onetrust.com",
  workerUrl: "https://portal-api.onetrust.com",
  // Rota do backend local de homologação. Pode ser substituída pela URL
  // do backend corporativo quando ele estiver disponível.
  tokenEndpoint: "/api/onetrust/token"
};
