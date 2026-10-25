import { isNative } from './lib/runtime'

export async function initMobile() {
  if(!isNative)return
  document.documentElement.classList.add('native-app')
  const {App}=await import('@capacitor/app')
  await App.addListener('backButton',({canGoBack})=>{
    if(canGoBack) window.history.back()
    else App.minimizeApp()
  })
}
