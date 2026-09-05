import requests as r

url = "https://ieeerecruitment.shivzee.in/api/v1"
appId = "0434de21-2d8f-40d0-a43b-4b1401dd38fb"

loginData = '''
{
    "email" : "mukesh.raj2025@vitstudent.ac.in",
    "password" : "911BCE141269"
}
'''

login = r.post(url + "/auth/login", data = loginData)

token = login.json().get("token")

header = {"Authorization" : "Bearer " + token}

#questions = r.get(url + "/questions?dept=technical", headers = header)
#
#print(questions.json())

quesId = "536cfe39-cab2-45ce-a3e6-77731406d195"

res = {
    "answers": [
        {
            "question_id" : "536cfe39-cab2-45ce-a3e6-77731406d195",
            "body" : "https://github.com/mukesh-5059/"
        }
    ]
}


#submit = r.patch(url + f"/applications/{appId}/save", json = res, headers = header)
submit = r.post(url + "/applications/0434de21-2d8f-40d0-a43b-4b1401dd38fb/submit", headers = header)
print(submit.text)