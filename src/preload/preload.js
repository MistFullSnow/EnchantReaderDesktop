import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('EnchantAPI', {
  openPdf: async () => {
    return await ipcRenderer.invoke('open-pdf')
  }
})
