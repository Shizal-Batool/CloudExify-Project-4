import urllib.request
import re
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

req = urllib.request.Request("https://fatimacooks.net/roghni-naan-recipe/", headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

match = re.search(r'src="(https://[^"]+roghni[^"]+\.jpg)"', html, re.IGNORECASE)
if not match:
    match = re.search(r'src="(https://[^"]+\.jpg)"', html)

if match:
    img_url = match.group(1)
    print("Found image:", img_url)
    req_img = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_img) as response, open("images/roghni_naan.png", 'wb') as out_file:
        out_file.write(response.read())
        print("Success")
else:
    print("No image found")
