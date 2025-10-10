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
// #include <U8g2lib.h>

// Network and Firebase credentials
#define WIFI_SSID "Galaxy M12 6475"
#define WIFI_PASSWORD "PentolKuah"

#define Web_API_KEY "AIzaSyAujGS8fDmyVlIaFgHZd85bOYL8cMWOzI4"
#define DATABASE_URL "https://techbridge-hydroponic-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define USER_EMAIL "byhqcplysh@gmail.com"
#define USER_PASS "Admin123"


// define pin and type sensor
#define DHTPIN 18
#define DHTTYPE DHT11
#define MQ_PIN 32
#define LDRPIN 34
#define RELAY_PIN 26
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


void setup(){
  Serial.begin(115200);

  // setup pin input & output
  pinMode(LDRPIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  // Connect to Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("Connected");
  
  // Configure SSL client
  ssl_client.setInsecure();
  ssl_client.setTimeout(15000);
  ssl_client.setHandshakeTimeout(5);
  
  // Initialize Firebase
  initializeApp(aClient, app, getAuth(user_auth), processData, "🔐 authTask");
  app.getApp<RealtimeDatabase>(Database);
  Database.url(DATABASE_URL);
}

void loop(){
  // Maintain authentication and async tasks
  app.loop();
  // Check if authentication is ready
  if (app.ready()){ 
    // Periodic data sending every 10 seconds
    unsigned long currentTime = millis();
    if (currentTime - lastSendTime >= sendInterval){
      // Update the last send time
      lastSendTime = currentTime;
      
      sensors.requestTemperatures();
      // read sensor
      float temperature = dht.readTemperature();
      float humidity = dht.readHumidity();    
      int gasValue = analogRead(MQ_PIN);
      float tempWater = sensors.getTempCByIndex(0);

      Serial.printf("Suhu Lingkungan: %.2f°C, Kelembaban: %.2f%%, Kondisi Udara: %d\n, Suhu Air: %.2f°C", temperature, humidity, gasValue, tempWater);

      // send to database
      Database.set<float>(aClient, "/sensors/temperature", temperature, processData, "RTDB_Temperature");
      Database.set<float>(aClient, "/sensors/humidity", humidity, processData, "RTDB_Humidity");
      Database.set<int>(aClient, "/sensors/gas", gasValue, processData, "RTDB_Gas");
      Database.set<float>(aClient, "/sensors/tempWater", tempWater, processData, "RTDB_TempWater");
    }
    int ldrValue = analogRead(LDRPIN);
    bool relayState = false;

    if (ldrValue < LDR_THRESHOLD)
    {
      digitalWrite(RELAY_PIN, HIGH);
      relayState = true;
    } else {
      digitalWrite(RELAY_PIN, LOW);
      relayState = false;
    }

    if (currentTime - lastLdrSend >= ldrInterval) {
      lastLdrSend = currentTime;
      Database.set<int>(aClient, "sensors/ldr", ldrValue, processData, "RTDB_LDR");
      Database.set<bool>(aClient, "relay/ldrLamp", relayState, processData, "RTDB_Relay");
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