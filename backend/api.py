from flask import Flask, request, render_template, jsonify
import elasticsearch
import datetime

app = Flask(__name__)
es = elasticsearch.Elasticsearch(hosts=["http://localhost:9200"])

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


if __name__ == '__main__':
    app.run(debug=True)
