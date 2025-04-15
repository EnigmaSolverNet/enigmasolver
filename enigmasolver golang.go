package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type EnigmaSolver struct {
	baseURL string
	apiKey  string
	timeout int
	client  *http.Client
}

type Proxy struct {
	proxyStr        string
	proxyType       string
	parsedProxyDict map[string]interface{}
}

type ProxyType struct{}

type Result struct {
	Status   string
	Solved   bool
	ErrorId  string
	Error    string
	Solution string
}

type CaptchaType struct{}

func (pt *ProxyType) HTTP() string   { return "http" }
func (pt *ProxyType) SOCKS4() string { return "socks4" }
func (pt *ProxyType) SOCKS5() string { return "socks5" }

func (ct *CaptchaType) RecaptchaV3() string           { return "RecaptchaV3Task" }
func (ct *CaptchaType) RecaptchaV2Enterprise() string { return "RecaptchaV2EnterpriseTask" }
func (ct *CaptchaType) RecaptchaV3Enterprise() string { return "RecaptchaV3EnterpriseTask" }
func (ct *CaptchaType) RecaptchaV2Proxyless() string  { return "RecaptchaV2TaskProxyless" }
func (ct *CaptchaType) RecaptchaV3Proxyless() string  { return "RecaptchaV3TaskProxyless" }
func (ct *CaptchaType) RecaptchaV2EnterpriseProxyless() string {
	return "RecaptchaV2EnterpriseTaskProxyless"
}
func (ct *CaptchaType) RecaptchaV3EnterpriseProxyless() string {
	return "RecaptchaV3EnterpriseTaskProxyless"
}

func NewProxy(proxyStr string, proxyType string) (*Proxy, error) {
	p := &Proxy{
		proxyStr:  proxyStr,
		proxyType: proxyType,
	}
	parsed, err := p._format_proxy()
	if err != nil {
		return nil, err
	}
	p.parsedProxyDict = parsed
	return p, nil
}

func (p *Proxy) _format_proxy() (map[string]interface{}, error) {
	proxy := p.proxyStr
	host, port, user, password := "", "", "", ""

	if strings.Count(proxy, ":") == 3 {
		parts := strings.Split(proxy, ":")
		host, port, user, password = parts[0], parts[1], parts[2], parts[3]
	} else if strings.Count(proxy, ":") == 1 {
		parts := strings.Split(proxy, ":")
		host, port = parts[0], parts[1]
	} else if strings.Count(proxy, "@") == 1 && strings.Count(proxy, ":") == 2 {
		parts := strings.Split(proxy, "@")
		userPass := strings.Split(parts[0], ":")
		hostPort := strings.Split(parts[1], ":")
		user, password = userPass[0], userPass[1]
		host, port = hostPort[0], hostPort[1]
	} else {
		return nil, errors.New("Invalid proxy format")
	}

	portInt, err := strconv.Atoi(port)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"proxyAddress":  host,
		"proxyPort":     portInt,
		"proxyLogin":    user,
		"proxyPassword": password,
		"proxyType":     p.proxyType,
	}, nil
}

func NewEnigmaSolver(apiKey string, timeout int) *EnigmaSolver {
	return &EnigmaSolver{
		baseURL: "https://api.enigmasolver.net",
		apiKey:  apiKey,
		timeout: timeout,
		client: &http.Client{
			Timeout: time.Duration(timeout) * time.Second,
		},
	}
}

func (es *EnigmaSolver) GetBalance() (map[string]interface{}, error) {
	resp, err := es._do_request("POST", "/getBalance", map[string]interface{}{"clientKey": es.apiKey})
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	err = json.Unmarshal(resp, &result)
	return result, err
}

func (es *EnigmaSolver) ReCaptchaV2Proxyless(websiteURL, websiteKey, recaptchaDataSValue string, isInvisible bool, apiDomain, pageAction string) *Result {
	postData := map[string]interface{}{
		"type":                (&CaptchaType{}).RecaptchaV2Proxyless(),
		"websiteURL":          websiteURL,
		"websiteKey":          websiteKey,
		"recaptchaDataSValue": recaptchaDataSValue,
		"isInvisible":         isInvisible,
		"apiDomain":           apiDomain,
		"pageAction":          pageAction,
	}
	return es._process_task(postData)
}

func (es *EnigmaSolver) ReCaptchaV2EnterpriseProxyless(websiteURL, websiteKey string, enterprisePayload map[string]interface{}, isInvisible bool, apiDomain, pageAction string) *Result {
	postData := map[string]interface{}{
		"type":              (&CaptchaType{}).RecaptchaV2EnterpriseProxyless(),
		"websiteURL":        websiteURL,
		"websiteKey":        websiteKey,
		"enterprisePayload": enterprisePayload,
		"isInvisible":       isInvisible,
		"apiDomain":         apiDomain,
		"pageAction":        pageAction,
	}
	return es._process_task(postData)
}

func (es *EnigmaSolver) ReCaptchaV3Proxyless(websiteURL, websiteKey, pageAction, apiDomain string) *Result {
	postData := map[string]interface{}{
		"type":       (&CaptchaType{}).RecaptchaV3Proxyless(),
		"websiteURL": websiteURL,
		"websiteKey": websiteKey,
		"pageAction": pageAction,
		"apiDomain":  apiDomain,
	}
	return es._process_task(postData)
}

func (es *EnigmaSolver) ReCaptchaV3EnterpriseProxyless(websiteURL, websiteKey, pageAction, apiDomain string) *Result {
	postData := map[string]interface{}{
		"type":       (&CaptchaType{}).RecaptchaV3EnterpriseProxyless(),
		"websiteURL": websiteURL,
		"websiteKey": websiteKey,
		"pageAction": pageAction,
		"apiDomain":  apiDomain,
	}
	return es._process_task(postData)
}

func (es *EnigmaSolver) ReCaptchaV2Enterprise(websiteURL, websiteKey string, enterprisePayload map[string]interface{}, isInvisible bool, apiDomain, pageAction string, proxy *Proxy) *Result {
	postData := map[string]interface{}{
		"type":              (&CaptchaType{}).RecaptchaV2Enterprise(),
		"websiteURL":        websiteURL,
		"websiteKey":        websiteKey,
		"enterprisePayload": enterprisePayload,
		"isInvisible":       isInvisible,
		"apiDomain":         apiDomain,
		"pageAction":        pageAction,
	}
	for k, v := range proxy.parsedProxyDict {
		postData[k] = v
	}
	return es._process_task(postData)
}

func (es *EnigmaSolver) ReCaptchaV3(websiteURL, websiteKey, pageAction, apiDomain string, proxy *Proxy) *Result {
	postData := map[string]interface{}{
		"type":       (&CaptchaType{}).RecaptchaV3(),
		"websiteURL": websiteURL,
		"websiteKey": websiteKey,
		"pageAction": pageAction,
		"apiDomain":  apiDomain,
	}
	for k, v := range proxy.parsedProxyDict {
		postData[k] = v
	}
	return es._process_task(postData)
}

func (es *EnigmaSolver) ReCaptchaV3Enterprise(websiteURL, websiteKey, pageAction, apiDomain string, proxy *Proxy) *Result {
	postData := map[string]interface{}{
		"type":       (&CaptchaType{}).RecaptchaV3Enterprise(),
		"websiteURL": websiteURL,
		"websiteKey": websiteKey,
		"pageAction": pageAction,
		"apiDomain":  apiDomain,
	}
	for k, v := range proxy.parsedProxyDict {
		postData[k] = v
	}
	return es._process_task(postData)
}

func (es *EnigmaSolver) _do_request(method, path string, postData interface{}) ([]byte, error) {
	var req *http.Request
	var err error

	if method == "GET" {
		req, err = http.NewRequest("GET", es.baseURL+path, nil)
	} else if method == "POST" {
		body, err := json.Marshal(postData)
		if err != nil {
			return nil, err
		}
		req, err = http.NewRequest("POST", es.baseURL+path, bytes.NewBuffer(body))
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
		}
	} else {
		return nil, errors.New("Invalid Method")
	}

	if err != nil {
		return nil, err
	}

	resp, err := es.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}

func (es *EnigmaSolver) _process_response(response map[string]interface{}) *Result {
	result := &Result{}
	result.Status = response["status"].(string)
	result.Solved = result.Status == "ready"
	result.ErrorId = response["errorId"].(string)
	result.Error = response["errorDescription"].(string)
	if solution, ok := response["solution"].(map[string]interface{}); ok {
		result.Solution = solution["gRecaptchaResponse"].(string)
	}
	return result
}

func (es *EnigmaSolver) _process_task(postData map[string]interface{}) *Result {
	data := map[string]interface{}{
		"clientKey": es.apiKey,
		"task":      postData,
	}
	resp, err := es._do_request("POST", "/createTask", data)
	if err != nil {
		return &Result{Error: err.Error()}
	}

	var respData map[string]interface{}
	if err := json.Unmarshal(resp, &respData); err != nil {
		return &Result{Error: err.Error()}
	}

	if respData["taskId"] == nil {
		return es._process_response(respData)
	}
	taskID := respData["taskId"].(float64)
	startTime := time.Now()

	for {
		if time.Since(startTime).Seconds() > float64(es.timeout) {
			return es._process_response(map[string]interface{}{
				"errorId":          "12",
				"errorDescription": "Timeout",
				"status":           "failed",
			})
		}

		resp, err = es._do_request("POST", "/getTaskResult", map[string]interface{}{
			"clientKey": es.apiKey,
			"taskId":    taskID,
		})
		if err != nil {
			return &Result{Error: err.Error()}
		}

		if err := json.Unmarshal(resp, &respData); err != nil {
			return &Result{Error: err.Error()}
		}

		status := respData["status"].(string)
		if status == "ready" || status == "failed" {
			return es._process_response(respData)
		}

		time.Sleep(500 * time.Millisecond)
	}
}

func main() {
	apiKey := "your_key"
	enigmaSolver := NewEnigmaSolver(apiKey, 60)
	balance, err := enigmaSolver.GetBalance()
	if err != nil {
		fmt.Println("Error getting balance:", err)
	} else {
		fmt.Println(balance)
	}

	// PROXY TASK
	proxy, err := NewProxy("username:password@proxy_ip:port", (&ProxyType{}).HTTP())
	if err != nil {
		fmt.Println("Error creating proxy:", err)
		return
	}
	task := enigmaSolver.ReCaptchaV3(
		"https://www.example.com/",
		"6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-",
		"",
		"",
		proxy,
	)
	fmt.Println("Task Status:", task.Status)
	fmt.Println("Task Solved:", task.Solved)
	fmt.Println("Task Error:", task.Error)
	fmt.Println("Task ErrorId:", task.ErrorId)
	fmt.Println("Task Solution:", task.Solution)

	// PROXYLESS TASK
	task = enigmaSolver.ReCaptchaV2Proxyless(
		"https://www.example.com/",
		"6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-",
		"",
		false,
		"",
		"",
	)
	fmt.Println("Task Status:", task.Status)
	fmt.Println("Task Solved:", task.Solved)
	fmt.Println("Task Error:", task.Error)
	fmt.Println("Task ErrorId:", task.ErrorId)
	fmt.Println("Task Solution:", task.Solution)
}
