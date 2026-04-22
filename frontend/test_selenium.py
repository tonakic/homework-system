#!/usr/bin/env python3
import time
import sys

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    print("Selenium imported successfully")
except ImportError as e:
    print(f"Failed to import selenium: {e}")
    sys.exit(1)

options = Options()
options.add_argument("--headless")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--disable-gpu")

print("Starting browser...")
try:
    driver = webdriver.Chrome(options=options)
    print("Browser started successfully")
except Exception as e:
    print(f"Failed to start Chrome: {e}")
    sys.exit(1)

print("Loading diagnostic page...")
driver.get("http://localhost:8080/diagnostic.html")
time.sleep(2)

print(f"Page title: {driver.title}")
driver.save_screenshot("screenshot_initial.png")
print("Screenshot saved: screenshot_initial.png")

log_element = driver.find_element(By.ID, "log")
print(f"Initial log content: {log_element.text}")

print("\nClicking CDN Fail Toast button...")
try:
    buttons = driver.find_elements(By.TAG_NAME, "button")
    print(f"Found {len(buttons)} buttons")
    for i, btn in enumerate(buttons):
        print(f"  Button {i}: {btn.text}")

    if len(buttons) >= 2:
        buttons[1].click()
        print("Clicked button 1")

    time.sleep(1)

    toasts = driver.find_elements(By.CLASS_NAME, "van-toast")
    print(f"\nFound {len(toasts)} Toast elements")

    for i, toast in enumerate(toasts):
        print(f"Toast {i}:")
        print(f"  Display: {toast.value_of_css_property('display')}")
        print(f"  Visibility: {toast.value_of_css_property('visibility')}")
        print(f"  Z-Index: {toast.value_of_css_property('z-index')}")
        print(f"  Color: {toast.value_of_css_property('color')}")
        print(f"  Text: {toast.text}")
        print(f"  Inner HTML: {toast.get_attribute('innerHTML')[:200]}")

    driver.save_screenshot("screenshot_after_toast.png")
    print("\nScreenshot saved: screenshot_after_toast.png")

    print(f"\nUpdated log content: {log_element.text}")

except Exception as e:
    print(f"Error during test: {e}")
    driver.save_screenshot("screenshot_error.png")

driver.quit()
print("\nTest completed")