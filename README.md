# Listening Quest — MVP

영어 듣기 활동 후 사용하는 학생용 미니게임 웹앱의 1차 버전입니다.

## 포함 기능
- 학급/이름 입력
- 대화문 순서 맞추기
- 빈칸/객관식
- Speaking Challenge (지원 브라우저에서 Web Speech Recognition 사용)
- XP / Combo
- 결과 화면
- 교사용 데모 대시보드
- 브라우저 localStorage에 결과 저장

## 실행
`index.html`을 브라우저에서 열거나 GitHub Pages / Vercel에 배포하세요.

## 주의
현재 Speaking 점수는 전문적인 발음 평가 점수가 아닙니다.
브라우저가 인식한 문장과 목표 문장의 단어 일치도를 간단히 계산합니다.

현재 학생 결과는 각 기기의 localStorage에만 저장됩니다.
여러 학생 기기의 결과를 교사용 화면에 모으려면 다음 버전에서 Supabase 같은 백엔드를 연결해야 합니다.
