import numpy as np
import csv
import time
import threading
from entropy import compute_entropy,normalize
#import boto
from uuid import getnode as get_mac
from datetime import datetime
from mindwave_mobile import ThinkGearProtocol, ThinkGearRawWaveData, ThinkGearEEGPowerData, ThinkGearPoorSignalData, ThinkGearAttentionData, ThinkGearMeditationData
from textPrepare import *
import json
import zlib
import requests
import os
import sys


def uplodJson(Json,textId,compress=False):
    now = datetime.utcnow().strftime("%Y/%m/%d/%H%M%S")
    if compress:
        extension=".zlib"
        Json = zlib.compress(json.dumps(Json))
    else:
        extension=""
        Json = json.dumps(Json)
    
    #key = bucket.new_key("/bsr/%s/%s/%s.json%s"%(get_mac(),textId,now,extension))
    #key.set_contents_from_string()
    r = requests.put('http://brainspeedr.s3.amazonaws.com/bsr/%s/%s/%s.json%s'%(get_mac(),textId,now,extension), data=Json)


def selectArticle(path):
    print path
    return json.loads(open(path,'rb').read())

#def AR1(c=150,phi=0.5,sigma=1):    
#    return c + phi * self.currentRate + np.random.normal(scale=sigma)


        
def testRun():
    articleJson = selectArticles()
    showWords(articleJson)


class BSR():
    
    def __init__(self):
        self.port = '/dev/tty.MindWaveMobile-DevA'
        self.entropy_window = 256
        self.raw_log = []
        self.attention_esense= None
        self.meditation_esense= None 
        self.eeg_power= None 
        self.signal_quality = 0
        self.start_time = None
        self.end_time = None
        self.timediff = None
        self.currentEntropy = 0
        self.entropy = [0] #list(np.random.rand(30)/100.)
        self.onText = True
        self.poorSignal = 100
        self.deque = 10
        self.normalized_entropy = [0]
        self.currentRate = 0.125
        self.adaptivity = -0.005
        self.Json = {}
    
#    def selectWords(self):
#        wordList = text1.split()
#        unique,count = np.unique(wordList,return_counts=True)        
#        lengths = np.array([len(i) for i in unique])
#        c = (count <= 5)*(lengths > 5)
#        return unique[c]

    def postToServer(self, route, json):
        return requests.post(webserver + route, data=json, headers={'content-type': 'application/json'}) 

    def sendWord(self,word):
        self.postToServer('/show_word', json.dumps({'word': word}))

    def AR1(self,c=0.150,phi=0.075,sigma=0.001):
        return (1.) * self.currentRate + np.random.normal(scale=sigma)
        
    def updateRate(self,treatment):
        if treatment=="bsr":
            return self.currentRate*(1 + (self.adaptivity*self.currentEntropy))
        elif treatment=="AR":
            return self.AR1()
        else:
            return self.currentRate

    def showWords(self,articleJson,treatment):
        txt = articleJson['content']
        wordListRead = txt.split()
        time.sleep(5)
        
        for word in wordListRead:            
            self.currentRate = self.updateRate(treatment)
            
            if word[-1] in [",","-"]:
                self.sendWord(word)
                time.sleep(self.currentRate*1.5)
            elif word[-1] in [".",";",":"]:
                self.sendWord(word)
                time.sleep(self.currentRate*3)
            elif word[-1]=="|":
                self.sendWord(word[:-1])
                time.sleep(self.currentRate*4)
            else:
                self.sendWord(word)
                time.sleep(self.currentRate)

    def generateQuestions(self,articleJson):
        return [{'question':'Please tell us briefly about the article you have just read.', 'type':'free_response'},
        {'question':'Can you remember people, places, organizations and institutions mentioned in the article? (List one per line).', 'type':'free_recall'},
        {'question':'Which of these words appeared in the text?', 'type':'multiple_choice', 'choices':['Tel Aviv', 'Neurosky', 'UIST']}]

    def sendQuestions(self,questions):
        self.postToServer('/show_questions', json.dumps(questions))

    def experiment(self,articleJson):
        # self.showWords(articleJson,treatment)
        self.sendQuestions(self.generateQuestions(articleJson))
        
    def readEEG(self):
        
        Median = []
        Std = []
        for pkt in ThinkGearProtocol(self.port).get_packets():
            #print pkt
            for d in pkt:
 
                if isinstance(d, ThinkGearPoorSignalData):
                    self.signal_quality += int(str(d))
                    self.poorSignal = int(str(d))
                    #print self.poorSignal
                    
                if isinstance(d, ThinkGearAttentionData):
                    self.attention_esense = int(str(d))
 
                if isinstance(d, ThinkGearMeditationData):
                    self.meditation_esense = int(str(d))
 
                if isinstance(d, ThinkGearEEGPowerData):
                    # this cast is both amazing and embarrassing
                    self.eeg_power = eval(str(d).replace('(','[').replace(')',']'))
 
                if isinstance(d, ThinkGearRawWaveData): 
                    # record a reading
                    # how/can/should we cast this data beforehand?
                    self.raw_log.append(float(str(d))) 
                    
                    if len(self.raw_log) == self.entropy_window:
                        
                        Median.append(np.median(self.raw_log))
                        Std.append(np.std(self.raw_log))              
                        
                        if Median[-1] > 150:
                            self.entropy.append(self.entropy[-1])
                        else:
                            self.entropy.append(compute_entropy(self.raw_log,1))
                        
                        self.normalized_entropy.append(normalize(self.entropy[-self.deque:])[-1])

                        self.currentEntropy = self.normalized_entropy[-1]
                        #print self.currentEntropy
                        self.raw_log = []

            if self.onText == False:
                break
    

    
    def run(self, articleJson):
        tEEG = threading.Thread(target=bsr.readEEG)
        tEEG.daemon = True
        tEEG.start()
        
        Json = bsr.experiment(articleJson)
        return Json
        #except:
        #    print "program terminated"

if __name__ == '__main__':

    article_selection = sys.argv[1]
    condition_selection = sys.argv[2]
    
    global webserver
    webserver = 'http://127.0.0.1:3000'
    
    global onText    
    global questions
    questions = 3
    
    global Json
        
    global treatment
    treatment = condition_selection
    
    bsr = BSR()
    #bsr.readEEG()
    
    Json = bsr.run(selectArticle(article_selection))
#    '''
    
        #print bsr.onText
 #   '''
        