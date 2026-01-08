import React from 'react';
import BaseToast, { ToastType } from './BaseToast';
export const Config = {
    success: (props) => (<BaseToast title={props?.text1} body={props?.text2} toastType={ToastType.Success}/>),
    warn: (props) => (<BaseToast title={props?.text1} body={props?.text2} toastType={ToastType.Warn} onPress={props?.onPress}/>),
    error: (props) => (<BaseToast title={props?.text1} body={props?.text2} toastType={ToastType.Error} onPress={props?.onPress}/>),
    info: (props) => (<BaseToast title={props?.text1} body={props?.text2} toastType={ToastType.Info} onPress={props?.onPress}/>),
};
export default Config;
