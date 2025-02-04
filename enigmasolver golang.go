package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"
)

type EnigmaSolver struct {
	APIKey  string
	Timeout time.Duration
	Client  *http.Client
}

type Result struct {
	Status   string `json:"status"`
	Solved   bool   `json:"solved"`
	ErrorId  string `json:"errorId"`
	Error    string `json:"errorDescription"`
	Solution string `json:"solution.gRecaptchaResponse"`
}

type CaptchaType string

const (
	RecaptchaV2           CaptchaType = "RecaptchaV2TaskProxyless"
	RecaptchaV3           CaptchaType = "RecaptchaV3TaskProxyless"
	RecaptchaV2Enterprise CaptchaType = "RecaptchaV2EnterpriseTaskProxyless"
	RecaptchaV3Enterprise CaptchaType = "RecaptchaV3EnterpriseTaskProxyless"
)

func NewEnigmaSolver(apiKey string, timeout int) *EnigmaSolver {
	return &EnigmaSolver{
		APIKey:  apiKey,
		Timeout: time.Duration(timeout) * time.Second,
		Client:  &http.Client{Timeout: time.Duration(timeout) * time.Second},
	}
}

func (e *EnigmaSolver) GetBalance() (map[string]interface{}, error) {
	return e.doRequest("POST", "/getBalance", map[string]string{"clientKey": e.APIKey})
}

func (e *EnigmaSolver) ReCaptchaV2(websiteURL, websiteKey, recaptchaDataSValue string, isInvisible bool, apiDomain, pageAction string) (*Result, error) {
	return e.processTask(map[string]interface{}{
		"type":                RecaptchaV2,
		"websiteURL":          websiteURL,
		"websiteKey":          websiteKey,
		"recaptchaDataSValue": recaptchaDataSValue,
		"isInvisible":         isInvisible,
		"apiDomain":           apiDomain,
		"pageAction":          pageAction,
	})
}

func (e *EnigmaSolver) ReCaptchaV2Enterprise(websiteURL, websiteKey string, enterprisePayload map[string]interface{}, isInvisible bool, apiDomain, pageAction string) (*Result, error) {
	return e.processTask(map[string]interface{}{
		"type":              RecaptchaV2Enterprise,
		"websiteURL":        websiteURL,
		"websiteKey":        websiteKey,
		"enterprisePayload": enterprisePayload,
		"isInvisible":       isInvisible,
		"apiDomain":         apiDomain,
		"pageAction":        pageAction,
	})
}

func (e *EnigmaSolver) ReCaptchaV3(websiteURL, websiteKey, pageAction, apiDomain string) (*Result, error) {
	return e.processTask(map[string]interface{}{
		"type":       RecaptchaV3,
		"websiteURL": websiteURL,
		"websiteKey": websiteKey,
		"pageAction": pageAction,
		"apiDomain":  apiDomain,
	})
}

func (e *EnigmaSolver) ReCaptchaV3Enterprise(websiteURL, websiteKey, pageAction, apiDomain string) (*Result, error) {
	return e.processTask(map[string]interface{}{
		"type":       RecaptchaV3Enterprise,
		"websiteURL": websiteURL,
		"websiteKey": websiteKey,
		"pageAction": pageAction,
		"apiDomain":  apiDomain,
	})
}

func (e *EnigmaSolver) doRequest(method, path string, postData interface{}) (map[string]interface{}, error) {
	url := "https://api.enigmasolver.net" + path
	jsonData, _ := json.Marshal(postData)

	req, err := http.NewRequest(method, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := e.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return result, nil
}

func (e *EnigmaSolver) processTask(postData map[string]interface{}) (*Result, error) {
	resp, err := e.doRequest("POST", "/createTask", map[string]interface{}{
		"clientKey": e.APIKey,
		"task":      postData,
	})
	if err != nil {
		return nil, err
	}
	taskID := resp["taskId"].(float64)

	startTime := time.Now()
	for {
		if time.Since(startTime) > e.Timeout {
			return &Result{Status: "failed", ErrorId: "12", Error: "Timeout"}, nil
		}
		taskResp, err := e.doRequest("POST", "/getTaskResult", map[string]string{
			"clientKey": e.APIKey,
			"taskId":    fmt.Sprintf("%v", taskID),
		})
		if err != nil {
			return nil, err
		}
		if taskResp["status"].(string) == "ready" || taskResp["status"].(string) == "failed" {
			return e.processResponse(taskResp), nil
		}
		time.Sleep(500 * time.Millisecond)
	}
}

func (e *EnigmaSolver) processResponse(response map[string]interface{}) *Result {
	if response == nil {
		return &Result{}
	}
	status, _ := response["status"].(string)
	errorId := fmt.Sprintf("%v", response["errorId"])
	errorDesc := fmt.Sprintf("%v", response["errorDescription"])
	var solution string
	if solutionMap, ok := response["solution"].(map[string]interface{}); ok {
		solution, _ = solutionMap["gRecaptchaResponse"].(string)
	}
	return &Result{
		Status:   status,
		Solved:   status == "ready",
		ErrorId:  errorId,
		Error:    errorDesc,
		Solution: solution,
	}
}

func main() {
	apiKey := "your_key"
	enigmaSolver := NewEnigmaSolver(apiKey, 60)
	balance, _ := enigmaSolver.GetBalance()
	fmt.Println("Balance:", balance)
	solved, err := enigmaSolver.ReCaptchaV2("6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-", "https://www.google.com/recaptcha/api2/demo", "", false, "", "")
	if err != nil {
		println(fmt.Sprintf("Error: %s", err.Error()))
	} else {
		println(fmt.Sprintf("Solution: %s", solved.Solution))
		println(fmt.Sprintf("ErrorId: %s", solved.ErrorId))
		println(fmt.Sprintf("Error: %s", solved.Error))
		println(fmt.Sprintf("Solved: %s", strconv.FormatBool(solved.Solved)))
		println(fmt.Sprintf("Status: %s", solved.Status))
	}
}
