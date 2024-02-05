const puppeteer = require('puppeteer-extra');
const {
    executablePath
} = require('puppeteer')
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const baseUrl = "https://www.google.com/";
const path = require('path');

const captcha = path.join(process.cwd(), "src/extension/captcha/");
const cghost = path.join(process.cwd(), "src/extension/cghost/");
const spoof = path.join(process.cwd(), "src/extension/spoof/");

let browser;
let page;

let stop = false;
const proccess = async (logToTextarea, logToTable, proggress, data) => {
    data.captcha && puppeteer.use(
        RecaptchaPlugin({
            provider: {
                id: '2captcha',
                token: data.apikey
            },
            visualFeedback: true
        })
    )

    const extensionOption = data.cghost ? cghost : spoof;
    const buserOption = data.buster ? captcha : spoof;

    browser = await puppeteer.launch({
        executablePath: executablePath(),
        headless: data.visible,
        defaultViewport: null,
        args: [
            // "--force-device-scale-factor=0.5",
            `--disable-extensions-except=${spoof},${extensionOption},${buserOption}`,
            `--load-extension=${spoof},${extensionOption},${buserOption}`,
        ]
    });

    const context = browser.defaultBrowserContext();
    await context.overridePermissions(baseUrl, ["geolocation", "notifications"]);

    page = await browser.newPage();

    page.sleep = function (timeout) {
        return new Promise(function (resolve) {
            setTimeout(resolve, timeout);
        });
    };

    data.buster && page.on('load', async () => {
        await solveCaptcha(logToTextarea)
    })

    data.buster && await handleBuster(data)
    data.cghost && await vpnCghost(data, logToTextarea)

    await page.goto(baseUrl, {
        waitUntil: ['networkidle2', 'domcontentloaded'],
        timeout: 120000
    });

    logToTextarea('[INFO] Open Google Page...\n');

    const rawKeywords = fs.readFileSync(data.files, 'utf-8').split('\n').filter(line => line !== "");
    for (let i = 0; i < rawKeywords.length; i++) {
        const item = rawKeywords[i];
        const [keyword, target] = item.split(';');
        if (keyword && target) {
            await searchKeyword(page, keyword.trim(), target.trim(), logToTextarea, logToTable, data);
            const progressPercentage = parseInt(((i + 1) / rawKeywords.length) * 100);
            proggress(progressPercentage);
        } else {
            logToTextarea('Invalid line in the input file:', item);
        }
    }

    await browser.close();
};

async function searchKeyword(page, keyword, target, logToTextarea, logToTable, data) {
    try {
        if (data.captcha) {
            try {
                const recaptchaResponse = await page.solveRecaptchas();
                if (recaptchaResponse.length > 0) {
                    logToTextarea("Recaptcha solved");
                    await page.waitForTimeout(2000);
                }
            } catch (err) {
                console.error("Error solving reCAPTCHA:", err);
                logToTextarea("Error solving reCAPTCHA");
                return;
            }
        }

        const search = await page.waitForSelector('textarea[name="q"]', {
            timeout: 120000
        })

        if (search) {
            const accept = await page.$('#L2AGLb');
            if (accept) {
                logToTextarea("[INFO] Accept Found ✅");
                const bahasa = await page.waitForSelector('button[id="vc3jof"]');
                await bahasa.click();
                await page.waitForSelector('li[aria-label="‪English‬"]');
                await page.click('li[aria-label="‪English‬"]');
                await page.sleep(6000)
                const aklans = await page.$('#L2AGLb');
                await aklans.click()
                await page.sleep(6000)
            }

            const subject = await page.$('[name="q"]')
            await subject.type(keyword)
            logToTextarea('[INFO] Typing : ' + keyword);

            await page.sleep(2000)

            const btnSearch = await page.$$('[name="btnK"]')
            if (btnSearch.length > 0) {
                await btnSearch[1].click()
            } else {
                await page.keyboard.press('Enter')
            }

            await Promise.all([
                await page.waitForNavigation({
                    waitUntil: ['domcontentloaded', "networkidle2"],
                    timeout: 120000
                })
            ])
        }

        if (data.captcha) {
            const recaptchaResponse = await page.solveRecaptchas();
            if (recaptchaResponse.length > 0) {
                logToTextarea("Recaptcha detected");
                await page.waitForTimeout(5000);
            }
        }

        const accept = await page.$('#L2AGLb')
        if (!accept) {

            await scrollDownToBottom(page);
            let currentPage = 1;

            logToTextarea(`Searching for websites on page ${currentPage}...`);
            const searchResults = await page.$$('.N54PNb.BToiNc.cvP2Ce');
            logToTextarea("Number of Search Results: " + searchResults.length + '\n');

            let found = false;

            for (let i = 0; i < searchResults.length; i++) {
                let links = await searchResults[i].$('[jsname="UWckNb"]');
                const href = await links.evaluate(e => e.getAttribute('href'));

                if (href == target) {
                    logToTextarea("Website found at index: " + i);
                    logToTextarea('Found the website...✔\n');

                    const index = i + 1;
                    const titleElement = await links.$('h3');
                    const title = await titleElement.evaluate(e => e.innerText);
                    logToTable(index, target);

                    found = true;
                    break;
                }
            }

            if (!found) {
                logToTextarea('Website not found in search results.\n');
                logToTable('Not Found', keyword);
            }

            const cancelSelector = '[role="button"]';
            const cancel = await page.waitForSelector(cancelSelector, {
                visible: true,
                timeout: 5000
            });

            if (cancel) {
                await cancel.click();
                await page.waitForSelector('[role="button"]', {
                    hidden: true,
                    timeout: 5000
                });
                await page.waitForTimeout(5000);
            }

            await page.waitForTimeout(3000);
        } else { return; }
    } catch (error) {
        logToTextarea(error)
        await browser.close()
    }
}

async function scrollDownToBottom(page) {
    let lastScrollPosition = 0;
    let retries = 3;

    while (retries > 0) {
        const currentScrollPosition = await page.evaluate(() => window.scrollY);
        if (currentScrollPosition === lastScrollPosition) {
            retries--;
        } else {
            retries = 3;
        }

        lastScrollPosition = currentScrollPosition;
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(1000);
    }
}

const handleBuster = async (data) => {
    try {
        const pathId = path.join(process.cwd(), 'src/data/idBuster.txt');
        const id = fs.readFileSync(pathId, 'utf-8')
        if (id === '') {
            await page.goto('chrome://extensions', {
                waitUntil: ['domcontentloaded', "networkidle2"],
                timeout: 120000
            })
        } else {
            await page.goto(`chrome-extension://${id.trim()}/src/options/index.html`, {
                waitUntil: ['domcontentloaded', "networkidle2"],
                timeout: 120000
            })
        }

        if (id === '') {
            const idExtension = await page.evaluateHandle(
                'document.querySelector("body > extensions-manager").shadowRoot.querySelector("#items-list").shadowRoot.querySelectorAll("extensions-item")[0]'
            );
            await page.evaluate(e => e.style = "", idExtension)

            const id = await page.evaluate(e => e.getAttribute('id'), idExtension)

            await page.goto(`chrome-extension://${id}/src/options/index.html`, {
                waitUntil: ['domcontentloaded', "networkidle2"],
                timeout: 60000
            })

            fs.writeFileSync(pathId, id)
        }

        await page.sleep(3000)

        await page.evaluate(() => {
            document.querySelector("#app > div > div:nth-child(1) > div.option-wrap > div.option.select > div > div.v-input__control > div > div.v-field__field > div").click()
        })
        await page.sleep(3000)
        await page.evaluate(() => {
            document.querySelector("body > div.v-overlay-container > div > div > div > div:nth-child(3)").click()
        })

        const addApi = await page.$('#app > div > div:nth-child(1) > div.option-wrap > div.wit-add-api > button')
        addApi && await addApi.click()

        const fieldApi = await page.waitForSelector('#input-18')
        fieldApi && await fieldApi.type(data.busterKey)
    } catch (error) {
        await browser.close()
        throw error;
    }
}

const vpnCghost = async (data, logToTextarea) => {
    try {
        const pathId = path.join(process.cwd(), 'src/data/idghost.txt');
        const id = fs.readFileSync(pathId, 'utf-8')
        if (id === '') {
            await page.goto('chrome://extensions', {
                waitUntil: ['domcontentloaded', "networkidle2"],
                timeout: 120000
            })
        } else {
            await page.goto(`chrome-extension://${id.trim()}/index.html`, {
                waitUntil: ['domcontentloaded', "networkidle2"],
                timeout: 120000
            })
        }

        if (id === '') {
            const idExtension = await page.evaluateHandle(
                `document.querySelector("body > extensions-manager").shadowRoot.querySelector("#items-list").shadowRoot.querySelectorAll("extensions-item")[${data.buster ? 2 : 1}]`
            );
            await page.evaluate(e => e.style = "", idExtension)

            const id = await page.evaluate(e => e.getAttribute('id'), idExtension)

            await page.goto(`chrome-extension://${id}/index.html`, {
                waitUntil: ['domcontentloaded', "networkidle2"],
                timeout: 60000
            })

            fs.writeFileSync(pathId, id)
        }

        await page.sleep(3000)

        try {
            await page.waitForSelector('.selected-country')
        } catch (error) {
            await page.goto(`chrome-extension://${id.trim()}/index.html`, {
                waitUntil: ['domcontentloaded', "networkidle2"],
                timeout: 60000
            })
        }

        const pickCountry = await page.waitForSelector('.selected-country')
        pickCountry && await pickCountry.click()

        await page.sleep(5000)

        const dropBox = await page.waitForSelector('mat-option > .mat-option-text');

        if (dropBox) {
            const regionFiles = fs.readFileSync(data.country, 'utf-8').split('\n').filter(line => line !== "");
            const random = regionFiles[Math.floor(Math.random() * regionFiles.length)].toLowerCase();

            logToTextarea(`[INFO] Country Choosen ${random}`);

            await page.waitForSelector('mat-option > .mat-option-text');

            const choice = await page.evaluate(() => {
                const elements = document.querySelectorAll('mat-option > .mat-option-text');
                let data = [];
                for (let i = 0; i < elements.length; i++) {
                    data[i] = elements[i].innerText.toLowerCase().trim();
                }
                return data;
            });

            for (let i = 0; i < choice.length; i++) {
                if (choice[i] == random.trim()) {
                    const country = await page.$$('mat-option > .mat-option-text');
                    await country[i].click();
                    break;
                }
            }

            await page.sleep(3000)

            await page.evaluate(() => {
                document.querySelector('body > app-root > main > app-home > div > div.spinner > app-switch > div').click()
            })
        }

        await page.sleep(5000)
    } catch (error) {
        await browser.close()
        throw error;
    }
}

async function solveCaptcha(logToTextarea) {
    return new Promise(async (resolve, reject) => {
        try {
            const captchaBox = await page.$('[title="reCAPTCHA"]')
            if (captchaBox) {
                logToTextarea("[INFO] Captcha Found Solve....");
                await captchaBox.click()
                const elIframe = await page.waitForSelector('iframe[title="recaptcha challenge expires in two minutes"]');
                if (elIframe) {
                    const iframe = await elIframe.contentFrame();
                    if (iframe) {
                        const body = await iframe.waitForSelector('body');
                        if (body) {
                            const solverButton = await body.waitForSelector('#solver-button');
                            if (solverButton) {
                                try {
                                    await page.sleep(3000)
                                    solverButton && await solverButton.click();
                                    await page.sleep(3000)

                                    if (!solverButton && !(await page.url().includes('sorry/index'))) {
                                        logToTextarea("[INFO] Solved ✅");
                                        resolve();
                                    }
                                } catch (error) {
                                    logToTextarea('Error clicking the button:', error.message);
                                    reject(error);
                                }
                            } else {
                                logToTextarea('Button not found in the iframe body.');
                                reject(new Error('Button not found in the iframe body.'));
                            }
                        } else {
                            logToTextarea('Body element not found in the iframe.');
                            reject(new Error('Body element not found in the iframe.'));
                        }
                    } else {
                        logToTextarea('Content frame not found for the iframe.');
                        reject(new Error('Content frame not found for the iframe.'));
                    }
                } else {
                    logToTextarea('Iframe with title "captcha" not found on the page.');
                    reject(new Error('Iframe with title "captcha" not found on the page.'));
                }
            }

        } catch (error) {
            logToTextarea(error);
            reject(error);
        }
    });
}

const stopProccess = (logToTextarea) => {
    stop = true;
}

module.exports = {
    proccess,
    stopProccess
}