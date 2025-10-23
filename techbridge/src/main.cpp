#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <DHT.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <WebServer.h>
#include <time.h>
// #include <U8g2lib.h>

// Network and Firebase credentials
// #define WIFI_SSID "Galaxy M12 6475"
// #define WIFI_PASSWORD "PentolKuah"

#define Web_API_KEY "AIzaSyAujGS8fDmyVlIaFgHZd85bOYL8cMWOzI4"
#define DATABASE_URL "https://techbridge-hydroponic-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define USER_EMAIL "byhqcplysh@gmail.com"
#define USER_PASS "Admin123"


// define pin and type sensor
#define DHTPIN 18
#define DHTTYPE DHT11
#define LDRPIN 34
#define DS18B20_PIN 4

// preparation dht 11
DHT dht(DHTPIN, DHTTYPE);

// ldr threshold
#define LDR_THRESHOLD 1500


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

// Timer variables for sending data every 10 seconds and ldr variable
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 10000;
int lastLdrValue = 0;
const unsigned long ldrInterval = 5000; 
unsigned long lastLdrSend = 0;
OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);

WebServer server(80);
Preferences pref;

const char* apSSID = "TechBridge_Setup";
const char* apPASS = "12345678";
bool wifiConnected = false;
String deviceId = "";

// HTMML Setup WiFi Page
const char* setup_html = R"rawliteral(
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
const char* finish_setup = R"rawliteral(
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
  if (!getLocalTime(&timeinfo)) return "Unknown";
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


void startSetupPortal() {
  WiFi.mode(WIFI_AP);
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
    delay(10);
  }
}

void sendWiFiInfoToFirebase() {
  String deviceId = getDeviceID();
  String currentSSID = WiFi.SSID();
  String currentIP   = WiFi.localIP().toString();

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



void setup(){
  Serial.begin(115200);
  sensors.begin();
  dht.begin();

  // setup pin input & output
  pinMode(LDRPIN, INPUT);

  pref.begin("wifi", true);
  String ssid = pref.getString("ssid", "");
  String pass = pref.getString("pass", "");
  pref.end();

  if (ssid == "") {
    Serial.println("Tidak ada WiFi tersimpan → start setup mode");
    startSetupPortal();
  } else {
    WiFi.begin(ssid.c_str(), pass.c_str());
    Serial.print("Connecting to WiFi: ");
    Serial.println(ssid);

    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
      Serial.print(".");
      delay(500);
    }

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nFailed to connect → starting setup again...");
      startSetupPortal();
    } else {
      wifiConnected = true;
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
    Serial.println("Firebase Belum Siap atau WiFi Tidak Terhubung");
  }

}

void loop(){
  // Maintain authentication and async tasks
  app.loop();

  static bool wifiInfoSent = false;
  if (app.ready() && WiFi.status() == WL_CONNECTED && !wifiInfoSent) {
    sendWiFiInfoToFirebase();
    wifiInfoSent = true;
  }

  if (WiFi.status() != WL_CONNECTED && wifiInfoSent) {
    wifiInfoSent = false;
  }
  
  // Check if authentication is ready
  if (app.ready()){ 
    // Periodic data sending every 10 seconds
    unsigned long currentTime = millis();
    int ldrValue = analogRead(LDRPIN);
    if (currentTime - lastSendTime >= sendInterval){
      // Update the last send time
      lastSendTime = currentTime;
      
      sensors.requestTemperatures();
      // read sensor
      float temperature = dht.readTemperature();
      float humidity = dht.readHumidity();
      float tempWater = sensors.getTempCByIndex(0);
      
      Serial.printf("Suhu Lingkungan: %.2f°C, Kelembaban: %.2f%%, Suhu Air: %.2f°C, Intensitas Cahaya: %d\n", temperature, humidity, tempWater, ldrValue);

      // send to database
      String basePath = "devices/" + deviceId + "/sensors";

      Database.set<float>(aClient, basePath + "/temperature", temperature, processData, "RTDB_Temp");
      Database.set<float>(aClient, basePath + "/humidity", humidity, processData, "RTDB_Hum");
      Database.set<float>(aClient, basePath + "/tempWater", tempWater, processData, "RTDB_TempWater");
      Database.set<int>(aClient, basePath + "/ldr", ldrValue, processData, "RTDB_LDR");
    }

    const unsigned long activeUpdateInterval = 60000;
    static unsigned long lastActiveUpdate = 0;

    if (millis() - lastActiveUpdate > activeUpdateInterval) {
      Database.set<String>(aClient, "devices/" + deviceId + "/info/last_update", getFormattedTime());
      lastActiveUpdate = millis();
    }    
  }
}

void processData(AsyncResult &aResult) {
  if (!aResult.isResult()) return;

  if (aResult.isEvent())
    Firebase.printf("Event task: %s, msg: %s, code: %d\n",
                    aResult.uid().c_str(),
                    aResult.eventLog().message().c_str(),
                    aResult.eventLog().code());

  if (aResult.isDebug())
    Firebase.printf("Debug task: %s, msg: %s\n",
                    aResult.uid().c_str(),
                    aResult.debug().c_str());

  if (aResult.isError())
    Firebase.printf("Error task: %s, msg: %s, code: %d\n",
                    aResult.uid().c_str(),
                    aResult.error().message().c_str(),
                    aResult.error().code());

  if (aResult.available())
    Firebase.printf("task: %s, payload: %s\n",
                    aResult.uid().c_str(),
                    aResult.c_str());
}