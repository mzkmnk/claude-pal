#import <Capacitor/Capacitor.h>

CAP_PLUGIN(SSHPlugin, "SSH",
    CAP_PLUGIN_METHOD(connect, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(sendCommand, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(resizeWindow, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(disconnect, CAPPluginReturnPromise);
)