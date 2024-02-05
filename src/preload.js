const {
    contextBridge,
    ipcRenderer
} = require('electron');
const XLSX = require('xlsx');
const logTextarea = document.getElementById('log');
const logDiv = document.getElementById("logTextArea")
const logToggle = document.getElementById("logToggle")
const logTablle = document.getElementById("logTable")
const startBtn = document.getElementById("start")
const stoptBtn = document.getElementById("stop")
const fileList = document.getElementById("list")
const logTable = document.getElementById('data-table');
const table = document.getElementById('table-data')
const toggleView = document.getElementById("headless");
const exportBtn = document.getElementById("export");
const progressElem = document.getElementById('prog');
const Api = document.getElementById('apikey')
const busterKey = document.getElementById('busterKey')
const buster = document.getElementById('buster')
const captcha = document.getElementById('captcha')
const cghost = document.getElementById('cghost')
const country = document.getElementById('country')
const boxCountry = document.getElementById('boxCountry')
const version = document.getElementById('version')
const warp = document.getElementById('warp');
const message = document.getElementById('message');
const restartButton = document.getElementById('restart-button');
const loaderDownload = document.getElementById('warp-loader')
const pageNumber = document.getElementById('pageNumber')

const inputFields = [fileList];
document.getElementById("nav").style.webkitAppRegion = 'drag'

let previousReportData = [];

document.addEventListener("change", () => {
    if (logToggle.checked) {
        logDiv.classList.remove('hidden');
        logTextarea.scrollTop = logTextarea.scrollHeight;
    } else {
        logDiv.classList.add('hidden');
    }
})

buster.addEventListener('change', () => {
    if (buster.checked) {
        captcha.checked = false;
        Api.classList.add('hidden')
        busterKey.classList.remove('hidden')
    } else {
        busterKey.classList.add('hidden')
    }
})
captcha.addEventListener('change', () => {
    if (captcha.checked) {
        buster.checked = false;
        busterKey.classList.add('hidden')
        Api.classList.remove('hidden')
    } else {
        Api.classList.add('hidden')
    }
})

cghost.addEventListener('change', () => {
    if (cghost.checked) {
        boxCountry.classList.remove('hidden')
    } else {
        boxCountry.classList.add('hidden')
    }
})

startBtn.addEventListener('click', () => {
    if (validateForm(inputFields)) {
        const data = {
            files: fileList.files[0]?.path,
            visible : toggleView.checked ? false : 'new',
            captcha : captcha.checked,
            buster : buster.checked,
            country : country.files[0]?.path,
            apikey : Api.value,
            cghost: cghost.checked,
            busterKey: busterKey.value
        }
        
        if (buster.checked && busterKey.value === "") {
            busterKey.style.border = '1px solid red';
        } else {
            busterKey.style.border = '';
            if (cghost.checked && !buster.checked) {
                alert('Buster Needed !')
            } else {
                if (cghost.checked && country.value === "") {
                    country.style.border = "1px solid red"
                } else {
                    country.style.border = ""
                    progressElem.style.width = '0%';
                    clearLogTable();
                    previousReportData = [];
                    exportBtn.classList.add('hidden');
                    initNumb = 0;
                    ipcRenderer.send('start', data);
                }
            }
        }
        
    }
});

stoptBtn.addEventListener('click', () => {
    if (confirm('Realy want to stop the process?')) {
        ipcRenderer.send('stop');
    }
});

ipcRenderer.on('log', (event, logs) => {
    logTextarea.value = logs;
    logTextarea.scrollTop = logTextarea.scrollHeight;
});

function validateForm(fields) {
    let isValid = true;
    fields.forEach((field) => {
        if (field.value === '') {
            isValid = false;
            field.style.border = '1px solid red';
        } else {
            field.style.border = '';
        }
    });
    return isValid;
}

exportBtn.addEventListener('click', function () {
    const wb = XLSX.utils.table_to_book(document.getElementById('data-table'));
    if (!wb['Sheets']['Sheet1']['!cols']) {
        wb['Sheets']['Sheet1']['!cols'] = [];
    }
    wb['Sheets']['Sheet1']['!cols'][0] = {
        width: 5
    };
    wb['Sheets']['Sheet1']['!cols'][1] = {
        width: 14
    };
    wb['Sheets']['Sheet1']['!cols'][2] = {
        width: 40
    };

    const data = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array'
    });
    ipcRenderer.send('save-excel-data', data);
});

let initNumb = 0

function logToTable(search, hasil) {
    if (search !== undefined && hasil !== undefined) {
        const isDuplicate = previousReportData.some(report => report.search === search && report.hasil === hasil);

        if (!isDuplicate) {
            initNumb++;
            const newRow = table.insertRow();
            const rowHtml = `<tr><td>${initNumb}</td><td>${search}</td><td class="text-left">${hasil}</td></tr>`;
            newRow.innerHTML = rowHtml;
            document.getElementById('scrl').scrollTop = document.getElementById('scrl').scrollHeight;

            previousReportData.push({
                search,
                hasil
            });
        }
    }
}
ipcRenderer.on('logToTable', (event, report) => {
    for (const log of report) {
        logToTable(log.search, log.hasil);
    }
});


const elDis = [fileList, toggleView, Api, buster, cghost, busterKey, country, captcha, pageNumber]
ipcRenderer.on("run", () => {
    elDis.forEach((e) => {
        e.disabled = true
        startBtn.classList.add("hidden")
        stoptBtn.classList.remove("hidden")
    })
})

ipcRenderer.on("force", () => {
    elDis.forEach((e) => {
        e.disabled = false
        startBtn.classList.remove("hidden")
        stoptBtn.classList.add("hidden")
        exportBtn.classList.remove("hidden")
    })
})

document.addEventListener('change', () => {
    if (logTablle.checked) {
        logTable.classList.remove('hidden');
    } else {
        logTable.classList.add('hidden');
    }
});

function proggress(prog) {
    progressElem.style.width = `${prog}%`;
    progressElem.innerHTML = `${prog}%`;
}

ipcRenderer.on('proggress', (event, prog) => {
    for (const pros of prog) {
        proggress(pros);
    }
});

function clearLogTable() {
    const rowCount = logTable.rows.length;
    for (let i = rowCount - 1; i > 0; i--) {
        logTable.deleteRow(i);
    }
}

ipcRenderer.on('log', (event, logs) => {
    logTextarea.value = logs;
    logTextarea.scrollTop = logTextarea.scrollHeight;
});

ipcRenderer.on('logToTable', (event, report) => {
    for (const log of report) {
        logToTable(log.search, log.hasil);
    }
});

ipcRenderer.on('proggress', (event, prog) => {
    for (const pros of prog) {
        proggress(pros);
    }
});

ipcRenderer.on('run', () => {
    [fileList, toggleView].forEach(elem => elem.disabled = true);
    startBtn.classList.add('hidden');
    stoptBtn.classList.remove('hidden');
});

ipcRenderer.on('force', () => {
    [fileList, toggleView].forEach(elem => elem.disabled = false);
    startBtn.classList.remove('hidden');
    stoptBtn.classList.add('hidden');
    exportBtn.classList.remove('hidden');
});

window.addEventListener('DOMContentLoaded', function() {
setTimeout(function () {
    document.querySelector('.splash-container').classList.add('hidden');
    document.querySelector('.main').classList.remove('hidden');
}, 2000);
});

function validateInput(input) {
    input.value = Math.max(1, Math.min(10, input.value));
}

ipcRenderer.send('app_version');
ipcRenderer.on('app_version', (event, arg) => {
  version.innerText = 'v' + arg.version;
});

ipcRenderer.on('update_available', () => {
  ipcRenderer.removeAllListeners('update_available');
  message.innerText = 'A new update is available. Downloading now...';
  warp.classList.remove('hidden');
  loaderDownload.classList.remove('hidden');
});

ipcRenderer.on('update_progress', (event, progress) => {
  updateProgress = progress;
  const progsDown = document.getElementById('download-progress')
  progsDown.style.width = updateProgress + '%'
  progsDown.setAttribute('aria-valuenow', updateProgress)
});

ipcRenderer.on('update_downloaded', () => {
  ipcRenderer.removeAllListeners('update_downloaded');
  message.innerText = 'Update Downloaded. It will be installed on restart. Restart now?';
  restartButton.classList.remove('d-none');
  warp.classList.remove('hidden');

  loaderDownload.classList.add('hidden');
});

restartButton.addEventListener("click", (e) => {
  ipcRenderer.send('restart_app');
})