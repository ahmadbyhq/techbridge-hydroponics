#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <Arduino.h>
#include <BH1750.h>
#include <DHT.h>
#include <DallasTemperature.h>
#include <FirebaseClient.h>
#include <OneWire.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <Wire.h>
#include <nvs_flash.h>
#include <time.h>

#define Web_API_KEY "...." //api_key
#define DATABASE_URL "https://techbridge-hydroponic-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define USER_EMAIL "..." // email
#define USER_PASS "...." //password

// define pin and type sensor
#define DHTPIN 18
#define DHTTYPE DHT22
#define DS18B20_PIN 4
#define TDS 32
#define VREF 3.3
#define SCOUNT 30
#define LED_BLUE 16
#define LED_RED 17
#define SETUP_WIFI_BTN 27

// preparation dht 11
DHT dht(DHTPIN, DHTTYPE);

// preparation Light Sensor BH1750
// BH1750 lightMeter;

// User function
void processData(AsyncResult &aResult);

// Authentication
UserAuth user_auth(Web_API_KEY, USER_EMAIL, USER_PASS);

// Firebase components
FirebaseApp app;
WiFiClientSecure ssl_client;
using AsyncClient = AsyncClientClass;
AsyncClient aClient(ssl_client);
RealtimeDatabase Database;

// Timer variables for sending data every 10 seconds
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 10000;
OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);
int analogBuffer[SCOUNT];
int analogBufferTemp[SCOUNT];
int analogBufferIndex = 0;
float averageVoltage = 0;
float tdsValue = 0;
bool firebaseConnected = false;
bool sensorError = false;
unsigned long buttonPressTime = 0;
bool buttonHeld = false;

WebServer server(80);
Preferences pref;

const char *apSSID = "TechBridge_Setup";
const char *apPASS = "12345678";
bool wifiConnected = false;
bool wifiWasConnected = true;
unsigned long wifiDisconnectStart = 0;
String deviceId = "";
String ssid = "";
String pass = "";

enum deviceState {
  state_boot,
  state_setupPortal,
  state_connectingWifi,
  state_connected,
  state_wifiLost,
  state_factoryReset
};

deviceState currentState = state_boot;

// HTMML Setup WiFi Page
const char *setup_html = R"rawliteral(
<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TechBridge Hydroponic WiFi Setup</title>
        <style>
            * {
                box-sizing: border-box;
            }

            body {
                font-family: Roboto, Helvetica, Arial, sans-serif;
                background-color: #f7f9fa;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
                padding: 16px;
            }

            .card {
                background-color: rgba(223, 246, 236, 0.9);
                border: 1px solid #0a3622;
                border-radius: 1rem;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 400px;
                padding: 24px;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
            }

            .card h5 {
                text-align: center;
                color: #0a3622;
                font-size: 1.3rem;
                margin-top: 0;
                margin-bottom: 1rem;
            }

            form {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            label {
                font-weight: 500;
                font-size: small;
                margin-bottom: 6px;
                display: inline-block;
                color: #0a3622;
            }

            input[type="text"],
            input[type="password"] {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ccc;
                border-radius: 8px;
                font-size: 1rem;
                outline: none;
                transition: border-color 0.2s ease;
            }

            input[type="text"]:focus,
            input[type="password"]:focus {
                border-color: #0a3622;
            }

            button {
                background-color: #0a3622;
                color: white;
                font-size: small;
                font-weight: 500;
                padding: 10px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.25s ease;
            }

            button:hover {
                background-color: #09532e;
            }

            @media (max-width: 480px) {
                .card {
                    padding: 20px;
                }

                button {
                    font-size: 0.95rem;
                }
            }
        </style>
    </head>

    <body>
        <div class="card">
            <h5>TechBridge Hydroponic WiFi Setup</h5>
            <form action="/save" method="post">
                <div class="form-group">
                    <label for="ssid">WiFi SSID</label>
                    <input
                        type="text"
                        id="ssid"
                        name="ssid"
                        placeholder="Masukkan nama WiFi"
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="pass">WiFi Password</label>
                    <input
                        type="password"
                        id="pass"
                        name="pass"
                        placeholder="Masukkan kata sandi WiFi"
                        required
                    />
                </div>

                <button type="submit">Simpan</button>
            </form>
        </div>
    </body>
</html>
)rawliteral";

// HTML Finish Setup Page
const char *finish_setup = R"rawliteral(
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WiFi Berhasil Disimpan</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        font-family: Roboto, Helvetica, Arial, sans-serif;
        background-color: #f7f9fa;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        padding: 16px;
      }

      .card {
        background-color: rgba(223, 246, 236, 0.9);
        border: 1px solid #0a3622;
        border-radius: 1rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        width: 100%;
        max-width: 380px;
        padding: 28px 22px;
        text-align: center;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      }

      h3 {
        color: #0a3622;
        margin-top: 0;
        margin-bottom: 0.5rem;
      }

      p {
        color: #333;
        font-size: 0.95rem;
        margin-top: 0;
        margin-bottom: 0;
      }

      @media (max-width: 480px) {
        .card {
          padding: 24px;
        }
      }
    </style>
  </head>

  <body>
    <div class="card">
      <h3>WiFi Berhasil Disimpan!</h3>
      <p>Perangkat akan melakukan restart untuk menyambungkan ke jaringan WiFi yang baru.</p>
    </div>
  </body>
</html>
)rawliteral";

void handleRoot() { server.send(200, "text/html", setup_html); }

void handleSave() {
  String ssid = server.arg("ssid");
  String pass = server.arg("pass");

  pref.begin("wifi", false);
  pref.putString("ssid", ssid);
  pref.putString("pass", pass);
  pref.end();

  server.send(200, "text/html", finish_setup);
  delay(1500);
  ESP.restart();
}

String getDeviceID() {
  uint64_t chipid = ESP.getEfuseMac();
  char idBuffer[20];
  sprintf(idBuffer, "device_%04X", (uint32_t)(chipid & 0xFFFFFFFF));
  return String(idBuffer);
}

String getFormattedTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
    return "Unknown";
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buffer);
}

void waitForTimeSync() {
  struct tm timeinfo;
  Serial.print("Menunggu sinkronisasi waktu");
  for (int i = 0; i < 10; i++) {
    if (getLocalTime(&timeinfo)) {
      Serial.println("\nWaktu tersinkron!");
      return;
    }
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nSinkronisasi waktu gagal.");
}

void ledSet(bool red, bool blue) {
  digitalWrite(LED_RED, red);
  digitalWrite(LED_BLUE, blue);
}

void blinkBlueSlow() {
  static unsigned long last = 0;
  static bool s = false;
  if (millis() - last > 500) {
    last = millis();
    s = !s;
    digitalWrite(LED_BLUE, s);
  }
}

void blinkBlueFast() {
  static unsigned long last = 0;
  static bool s = false;
  if (millis() - last > 100) {
    last = millis();
    s = !s;
    digitalWrite(LED_BLUE, s);
  }
}

void blinkRedFast() {
  static unsigned long last = 0;
  static bool s = false;
  if (millis() - last > 100) {
    last = millis();
    s = !s;
    digitalWrite(LED_RED, s);
  }
}

void blinkAlternate() {
    static unsigned long last = 0;
    static bool toggle = false;

    if (millis() - last > 150) { 
        last = millis();
        toggle = !toggle;

        if (toggle) {
            ledSet(HIGH, LOW); 
        } else {
            ledSet(LOW, HIGH); 
        }
    }
}


void updateLED() {
  switch (currentState) {

  case state_boot:
    ledSet(HIGH, LOW);
    break;

  case state_setupPortal:
    blinkBlueFast();
    blinkRedFast();
    break;

  case state_connectingWifi:
    ledSet(HIGH, LOW);
    blinkBlueSlow();
    break;

  case state_connected:
    ledSet(HIGH, HIGH);
    break;

  case state_wifiLost:
    ledSet(HIGH, LOW);
    blinkBlueFast();
    break;

  case state_factoryReset:
    blinkAlternate();
    break;
  }
}

void startSetupPortal() {
  currentState = state_setupPortal;
  WiFi.mode(WIFI_AP);
  IPAddress local_ip(192, 168, 4, 1);
  IPAddress gateway(192, 168, 10, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(local_ip, gateway, subnet);

  WiFi.softAP(apSSID, apPASS);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("Setup AP IP: ");
  Serial.println(IP);

  server.on("/", handleRoot);
  server.on("/save", handleSave);
  server.begin();

  Serial.println("Setup portal running...");
  while (true) {
    server.handleClient();
    updateLED();
    delay(10);
  }
}

void sendWiFiInfoToFirebase() {
  String deviceId = getDeviceID();
  String currentSSID = WiFi.SSID();
  String currentIP = WiFi.localIP().toString();

  pref.begin("wifi", true);
  String savedPass = pref.getString("pass", "");
  pref.end();

  Serial.println("Mengirim info ke Firebase...");

  String path = "devices/" + deviceId + "/info";
  Database.set<String>(aClient, path + "/device_id", deviceId);
  Database.set<String>(aClient, path + "/ssid", currentSSID);
  Database.set<String>(aClient, path + "/ip", currentIP);
  Database.set<String>(aClient, path + "/password", savedPass);
  Database.set<String>(aClient, path + "/last_active", getFormattedTime());

}

// read TDS sensor
int getMedianNum(int bArray[], int iFilterLen) {
  int bTab[iFilterLen];
  for (int i = 0; i < iFilterLen; i++)
    bTab[i] = bArray[i];
  int i, j, bTemp;
  for (j = 0; j < iFilterLen - 1; j++)
    for (i = 0; i < iFilterLen - j - 1; i++)
      if (bTab[i] > bTab[i + 1]) {
        bTemp = bTab[i];
        bTab[i] = bTab[i + 1];
        bTab[i + 1] = bTemp;
      }
  return (iFilterLen & 1)
             ? bTab[(iFilterLen - 1) / 2]
             : (bTab[iFilterLen / 2] + bTab[iFilterLen / 2 - 1]) / 2;
}

float readTDS(float waterTemp) {
  static unsigned long analogSampleTimepoint = millis();
  if (millis() - analogSampleTimepoint > 40U) {
    analogSampleTimepoint = millis();
    analogBuffer[analogBufferIndex] = analogRead(TDS);
    analogBufferIndex++;
    if (analogBufferIndex == SCOUNT)
      analogBufferIndex = 0;
  }

  for (int i = 0; i < SCOUNT; i++)
    analogBufferTemp[i] = analogBuffer[i];
  averageVoltage = getMedianNum(analogBufferTemp, SCOUNT) * VREF / 4096.0;
  float compensationCoefficient = 1.0 + 0.02 * (waterTemp - 25.0);
  float compensationVoltage = averageVoltage / compensationCoefficient;
  tdsValue =
      (133.42 * pow(compensationVoltage, 3) -
       255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) *
      0.5;
  return tdsValue;
}

void checkSetupButton() {
  int btn = digitalRead(SETUP_WIFI_BTN);
  if (btn == LOW && millis() > 3000) {
    delay(30);
    Serial.println("Tombol ditekan");
    if (buttonPressTime == 0) {
      buttonPressTime = millis();
    }

    unsigned long held = millis() - buttonPressTime;

    if (held > 10000 && !buttonHeld) {
      buttonHeld = true;
      Serial.println("Factory Reset.....");

      currentState = state_factoryReset;
      unsigned long t = millis();
      while (millis() - t < 1200) {
        updateLED();
        delay(1);
      }
      nvs_flash_erase();
      nvs_flash_init();

      Serial.println("Selesai Factory Reset");
      Serial.println("ESP32 Memulai Restart....");
      delay(500);
      ESP.restart();
    }

    if (held > 3000 && held < 10000 && !buttonHeld) {
      buttonHeld = true;

      Serial.println("Reset WiFi....");
      pref.begin("wifi", false);
      bool reset_wifi = pref.clear();
      pref.end();

      if (reset_wifi) {
        Serial.println("WiFi Berhasil direset");
      } else {
        Serial.println("WiFi Gagal direset");
      }

      delay(500);
      ESP.restart();
    }
  } else {
    buttonPressTime = 0;
    buttonHeld = false;
  }
}


void updateLastActive() {
  String path = "devices/" + deviceId + "/info/last_update";
  Database.set<String>(aClient, path, getFormattedTime());
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  sensors.begin();
  dht.begin();
  // lightMeter.begin();
  currentState = state_boot;

  // setup pin input & output
  pinMode(LED_BLUE, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(SETUP_WIFI_BTN, INPUT_PULLUP);
  pinMode(TDS, INPUT);

  updateLED();
  checkSetupButton();

  pref.begin("wifi", true);
  ssid = pref.getString("ssid", "");
  pass = pref.getString("pass", "");
  pref.end();

  if (ssid == "") {
    Serial.println("Tidak ada WiFi tersimpan → start setup mode");
    startSetupPortal();
  } else {
    currentState = state_connectingWifi;
    WiFi.begin(ssid.c_str(), pass.c_str());
    Serial.print("Connecting to WiFi: ");
    Serial.println(ssid);

    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED &&
           millis() - startAttemptTime < 10000) {
      Serial.print(".");
      delay(500);
    }

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nFailed to connect → starting setup again...");
      delay(1000);
      startSetupPortal();
    } else {
      wifiConnected = true;
      currentState = state_connected;
      Serial.println("\nWiFi connected!");
      Serial.println(WiFi.localIP());
      deviceId = getDeviceID();
    }
  }

  // Configure SSL client
  ssl_client.setInsecure();
  ssl_client.setTimeout(15000);
  ssl_client.setHandshakeTimeout(5);

  // Initialize Firebase
  initializeApp(aClient, app, getAuth(user_auth), processData, "authTask");
  app.getApp<RealtimeDatabase>(Database);
  Database.url(DATABASE_URL);

  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  waitForTimeSync();

  unsigned long startFirebase = millis();
  while (!app.ready() && millis() - startFirebase < 10000) {
    app.loop();
    delay(100);
  }

  if (WiFi.status() == WL_CONNECTED && app.ready()) {
    sendWiFiInfoToFirebase();
  } else {
    Serial.println("Firebase Belum Siap atau WiFi Tidak Terhubung");;
  }
}

void loop() {
  // Maintain authentication and async tasks
  app.loop();
  checkSetupButton();
  updateLED();

  // helper wifi disconnect
  if (WiFi.status() != WL_CONNECTED) {
    currentState = state_wifiLost;
    if (wifiWasConnected) {
      wifiWasConnected = false;
      wifiDisconnectStart = millis();
    }

    Serial.println("WiFi Terputus! Reconnect WiFi");
    WiFi.disconnect();
    WiFi.begin(ssid.c_str(), pass.c_str());

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 5000) {
      Serial.println(".");
      delay(250);
    }

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nReconnect gagal!");

      // Jika sudah 60 detik tidak terhubung → masuk mode AP
      if (millis() - wifiDisconnectStart > 120000) {
        Serial.println("WiFi gagal terhubung. Masuk Setup Mode...");
        startSetupPortal();
      }
    } else {
      if (WiFi.status() == WL_CONNECTED) {
          currentState = state_connected;
      }
      Serial.println("\nWiFi Berhasil Terhubung Kembali");
      wifiWasConnected = true;
    }

    return;
  } else {
    wifiWasConnected = true;
  }

  // Check if authentication is ready
  if (app.ready()) {
    // Periodic data sending every 10 seconds
    unsigned long currentTime = millis();
    if (currentTime - lastSendTime >= sendInterval) {
      // Update the last send time
      lastSendTime = currentTime;

      sensors.requestTemperatures();
      // read sensor
      float temperature = dht.readTemperature();
      // float lux = lightMeter.readLightLevel();
      float humidity = dht.readHumidity();
      float tempWater = sensors.getTempCByIndex(0);
      float tdsValue = readTDS(tempWater);

      Serial.printf("Suhu Lingkungan: %.2f°C, Kelembaban: %.2f%%, Suhu Air: "
                    "%.2f°C, TDS: %.0f ppm\n",
                    temperature, humidity, tempWater, tdsValue);

      // send to database
      String basePath = "devices/" + deviceId + "/sensors";

      Database.set<float>(aClient, basePath + "/temperature", temperature,
                          processData, "RTDB_Temp");
      Database.set<float>(aClient, basePath + "/humidity", humidity,
                          processData, "RTDB_Hum");
      Database.set<float>(aClient, basePath + "/tempWater", tempWater,
                          processData, "RTDB_TempWater");
      // Database.set<int>(aClient, basePath + "/lux", lux, processData,
      // "RTDB_LUX");
      Database.set<float>(aClient, basePath + "/tds", tdsValue, processData,
                          "RTDB_TDS");
      updateLastActive();
    }
  }
}

void processData(AsyncResult &aResult) {
  if (!aResult.isResult())
    return;

  if (aResult.isEvent())
    Firebase.printf("Event task: %s, msg: %s, code: %d\n",
                    aResult.uid().c_str(), aResult.eventLog().message().c_str(),
                    aResult.eventLog().code());

  if (aResult.isDebug())
    Firebase.printf("Debug task: %s, msg: %s\n", aResult.uid().c_str(),
                    aResult.debug().c_str());

  if (aResult.isError())
    Firebase.printf("Error task: %s, msg: %s, code: %d\n",
                    aResult.uid().c_str(), aResult.error().message().c_str(),
                    aResult.error().code());

  if (aResult.available())
    Firebase.printf("task: %s, payload: %s\n", aResult.uid().c_str(),
                    aResult.c_str());
}