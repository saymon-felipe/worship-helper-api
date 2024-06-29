const puppeteer = require('puppeteer');

let cyphers = {
    scrapeCifraClub: function (query) {
        return new Promise(async (resolve, reject) => {
            try {
                let url = `https://www.cifraclub.com.br/?q=${query.toLowerCase().split(" ").join("+")}`;
                const browser = await puppeteer.launch({
                    executablePath: '/app/.apt/usr/bin/google-chrome',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                const page = await browser.newPage();

                await page.goto(url);

                await page.evaluate(() => {
                    return new Promise((resolve, reject) => {
                        var script = document.createElement('script');
                        script.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                });

                await page.waitForFunction('typeof jQuery !== "undefined"');

                const result = await page.evaluate(() => {
                    let elements = $('.gs-webResult.gs-result .gsc-thumbnail-inside a');
                    let data = elements.map((index, element) => {
                        return {
                            title: $(element).text(),
                            href: $(element).attr('href')
                        };
                    }).get();
                    return data;
                });

                await browser.close();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = cyphers;