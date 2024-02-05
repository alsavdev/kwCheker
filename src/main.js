const {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    dialog
} = require('electron');
const {
    proccess,
    stopProccess
} = require("./index");
const {
    autoUpdater
} = require('electron-updater')
const fs = require('fs');

let mainWindow;
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 480,
        height: 768,
        x: 880,
        y: 0,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0d6efd',
            symbolColor: '#fff'
        },
        icon: "./src/assets/logo.png",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: !app.isPackaged
        }
    });
    mainWindow.loadFile('src/index.html');
    app.isPackaged && Menu.setApplicationMenu(null)

    autoUpdater.on('download-progress', (progress) => {
        mainWindow.webContents.send('update_progress', progress.percent);
    });

    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on('update-available', () => {
        updateCheckInProgress = false;
        mainWindow.webContents.send('update_available');
    });

    autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update_downloaded');
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('start', async (event, data) => {
    const logs = [];
    const reports = [];
    const prog = [];

    const logToTextarea = (message) => {
        logs.push(message);
        event.sender.send('log', logs.join('\n'));
    };

    const logToTable = (search, hasil) => {
        try {
            reports.push({ search,hasil });
            event.sender.send('logToTable', reports);
        } catch (error) {
            logToTextarea('Kesalahan di logToTable:', error);
        }
    };

    const proggress = (pros) => {
        prog.push(pros);
        event.sender.send('proggress', prog);
    };

    try {
        logToTextarea('[INFO] Process started...');
        event.sender.send("run");
        await proccess(logToTextarea, logToTable, proggress, data);
        logToTextarea('[INFO] Process completed successfully.');
        event.sender.send("force");
    } catch (error) {
        event.sender.send("force");
        logToTextarea('[ERROR] ' + error.message);
    }
});

ipcMain.on('stop', (event) => {
    const logs = [];

    const logToTextarea = (message) => {
        logs.push(message);
        event.sender.send('log', logs.join('\n'));
    };

    event.sender.send("force");
    stopProccess(logToTextarea);
});

ipcMain.on('save-excel-data', (event, data) => {
    const options = {
        title: 'Save the data',
        defaultPath: `data-kw-checker.xlsx`,
        filters: [{
            name: '.xlsx',
            extensions: ['xlsx']
        }]
    };

    dialog.showSaveDialog(options).then(result => {
        if (!result.canceled) {
            fs.writeFileSync(result.filePath, new Uint8Array(data));
            dialog.showMessageBox({
                type: 'info',
                title: 'Alert',
                message: 'Success save the file report',
                buttons: ['OK']
            });
        } else {
            dialog.showMessageBox({
                type: 'info',
                title: 'Alert',
                message: 'File save cancelled',
                buttons: ['OK']
            });
        }
    }).catch(err => {
        console.error(err);
        dialog.showMessageBox({
            type: 'error',
            title: 'Error',
            message: 'An error occurred while saving the file.',
            buttons: ['OK']
        });
    });
});

ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', {
        version: app.getVersion()
    });
});

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});