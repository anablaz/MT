from flask import Flask, request, render_template, jsonify
import elasticsearch
import datetime
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)
es = elasticsearch.Elasticsearch(hosts=["http://localhost:9200"])

SERVER = "https://api.sledilnik.org/api"


@app.route('/covid_regije')
def covid_regije():

    # TODO : Make this configurable from query params
    days_back = int(request.args.get('days', 7))
    end_time = datetime.datetime.now()
    start_time = end_time - datetime.timedelta(days=days_back)
    
    try:
        
        resp = es.search(
            index="covid_regije",
            size=100,
            query={
                "bool": {
                    "must": [
                        {
                            "range": {
                                "@timestamp": {
                                    "gte": start_time.isoformat(),
                                    "lte": end_time.isoformat()
                                }
                            }
                        }
                    ]
                }
            },
            sort=[
                {"@timestamp": {"order": "desc"}}
            ]
        )
        
        # Extract just the source data
        hits = resp.get('hits', {}).get('hits', [])
        data = [hit['_source'] for hit in hits]
        total = resp['hits']['total']['value'] if isinstance(resp['hits']['total'], dict) else resp['hits']['total']
        
        return jsonify({
            "status": "success",
            "total": total,
            "timeframe": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat()
            },
            "data": data
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500
    

@app.route('/covid_starost')
def covid_starost():

    # TODO : Make this configurable from query params
    days_back = int(request.args.get('days', 7))
    end_time = datetime.datetime.now()
    start_time = end_time - datetime.timedelta(days=days_back)
    
    try:
        
        resp = es.search(
            index="covid_starost",
            size=100,
            query={
                "bool": {
                    "must": [
                        {
                            "range": {
                                "@timestamp": {
                                    "gte": start_time.isoformat(),
                                    "lte": end_time.isoformat()
                                }
                            }
                        }
                    ]
                }
            },
            sort=[
                {"@timestamp": {"order": "desc"}}
            ]
        )
        
        # Extract just the source data
        hits = resp.get('hits', {}).get('hits', [])
        data = [hit['_source'] for hit in hits]
        total = resp['hits']['total']['value'] if isinstance(resp['hits']['total'], dict) else resp['hits']['total']
        
        return jsonify({
            "status": "success",
            "total": total,
            "timeframe": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat()
            },
            "data": data
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@app.route('/daily_deaths')
def daily_deaths():
    try:
        response = requests.get(f"{SERVER}/daily-deaths-slovenia")
        response.raise_for_status()
        
        data = response.json()
        
        return jsonify({
            "status": "success",
            "total": len(data),
            "data": data
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch data from API: {str(e)}",
            "data": []
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@app.route('/daily_deaths_age')
def daily_deaths_age():
    try:
        response = requests.get(f"{SERVER}/age-daily-deaths-slovenia")
        response.raise_for_status()
        
        data = response.json()
        
        return jsonify({
            "status": "success",
            "total": len(data),
            "data": data
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch data from API: {str(e)}",
            "data": []
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@app.route('/lab_tests')
def lab_tests():
    try:
        response = requests.get(f"{SERVER}/lab-tests")
        response.raise_for_status()
        
        data = response.json()
        
        return jsonify({
            "status": "success",
            "total": len(data),
            "data": data
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch data from API: {str(e)}",
            "data": []
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500
    

@app.route('/summary')
def summary():
    try:
        response = requests.get(f"{SERVER}/summary")
        response.raise_for_status()
        
        data = response.json()
        
        return jsonify({
            "status": "success",
            "total": len(data),
            "data": data
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch data from API: {str(e)}",
            "data": []
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500
    

@app.route('/stats')
def stats():
    try:
        response = requests.get(f"{SERVER}/stats")
        response.raise_for_status()
        
        data = response.json()
        
        return jsonify({
            "status": "success",
            "data": data
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch data from API: {str(e)}",
            "data": []
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@app.route('/stats_weekly')
def stats_weekly():
    try:
        response = requests.get(f"{SERVER}/stats-weekly")
        response.raise_for_status()
        
        data = response.json()
        
        return jsonify({
            "status": "success",
            "data": data
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch data from API: {str(e)}",
            "data": []
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@app.route('/patients')
def patients():
    try:
        response = requests.get(f"{SERVER}/patients")
        response.raise_for_status()
        
        data = response.json()
        
        return jsonify({
            "status": "success",
            "total": len(data),
            "data": data
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch data from API: {str(e)}",
            "data": []
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


if __name__ == '__main__':
    app.run(debug=True)
